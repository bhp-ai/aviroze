from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile, Form, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from app.database import get_db
from app.db_models import Product, ProductImage, ProductVariant, User, Order, OrderItem, OrderStatus, UserActivityType, UserRole
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.auth import get_current_user, get_current_admin_user
from app.logging_helper import log_user_activity
import json
import base64

router = APIRouter(prefix="/api/products", tags=["Products"])

# Maximum file size for videos and GIFs (10MB)
MAX_MEDIA_SIZE = 10 * 1024 * 1024  # 10MB in bytes

def convert_image_to_data_url(image_binary: bytes, mimetype: str) -> str:
    """Convert binary image data to base64 data URL"""
    if not image_binary:
        return ""
    base64_image = base64.b64encode(image_binary).decode('utf-8')
    return f"data:{mimetype};base64,{base64_image}"

def get_product_images(product: Product, color: Optional[str] = None, request: Request = None) -> List[dict]:
    """Get all product images - videos/GIFs as URLs, images as base64 data URLs"""
    images = []

    # Add additional images from ProductImage table
    for img in product.images:
        # If color filter is specified, only include images for that color
        if color and img.color and img.color.lower() != color.lower():
            continue

        media_type = getattr(img, 'media_type', 'image')

        # For videos and GIFs, use URL endpoint instead of base64 to reduce transfer size
        if media_type in ['video', 'gif']:
            # Generate URL to media endpoint
            base_url = str(request.base_url) if request else "http://localhost:8000/"
            url = f"{base_url}api/products/media/{img.id}"
        else:
            # For images, keep using base64 (smaller files)
            url = convert_image_to_data_url(img.image, img.image_mimetype)

        images.append({
            "id": img.id,  # Add image ID for easier matching on updates
            "url": url,
            "color": img.color,
            "display_order": img.display_order,
            "media_type": media_type
        })

    # If no images in ProductImage table, use legacy image field
    if not images and product.image:
        images.append({
            "url": convert_image_to_data_url(product.image, product.image_mimetype or "image/jpeg"),
            "color": None,
            "display_order": 0,
            "media_type": "image"
        })

    # Sort images: videos/gifs first, then images
    images.sort(key=lambda x: (0 if x['media_type'] in ['video', 'gif'] else 1, x['display_order']))

    return images

def get_product_variants(product: Product, db: Session, use_actual_quantities: bool = False) -> List[dict]:
    """
    Get all product variants.

    Args:
        product: The product to get variants for
        db: Database session
        use_actual_quantities: If True, return actual stored quantities (for admin editing)
                              If False, return shared stock availability (for customer viewing)

    Uses shared stock formula when use_actual_quantities=False:
    - Total Available Stock = Legacy Stock - Sum of all orders
    - Variant Is Available = Total Available Stock > 0
    """
    variants = []

    if use_actual_quantities:
        # For admin editing - return actual stored quantities
        # Consolidate duplicates (same color+size) by summing quantities
        print(f"  get_product_variants: Admin mode - returning actual quantities")
        consolidated = {}
        for variant in product.variants:
            print(f"  Raw variant from DB: color={variant.color}, size={variant.size}, quantity={variant.quantity}")
            key = f"{variant.color or 'no-color'}_{variant.size}"
            if key in consolidated:
                consolidated[key]['quantity'] += variant.quantity
                print(f"    Duplicate found! New total for {key}: {consolidated[key]['quantity']}")
            else:
                consolidated[key] = {
                    "color": variant.color,
                    "size": variant.size,
                    "quantity": variant.quantity,
                    "available": True  # Admin always sees items as available for editing
                }
        variants = list(consolidated.values())
        print(f"  Final consolidated variants: {variants}")
    else:
        # For customer viewing - use shared stock formula
        # Calculate total available stock using shared formula
        total_available = calculate_available_stock(product, db)

        for variant in product.variants:
            variants.append({
                "color": variant.color,
                "size": variant.size,
                "quantity": total_available,  # All variants share the same pool
                "available": total_available > 0
            })

    return variants

def calculate_total_stock(product: Product, db: Session = None) -> int:
    """
    Calculate remaining stock using shared stock formula.

    Formula: Total Stock = Legacy Stock - Sum(all order quantities)

    This calculates stock remaining AFTER all orders have been placed.
    All variants share from the same stock pool.
    """
    if db is None:
        # Fallback if no db session provided
        return product.stock

    return calculate_available_stock(product, db)

def calculate_available_stock(product: Product, db: Session) -> int:
    """
    Calculate available stock: Legacy Stock - Sum of all orders.

    This is the core shared stock calculation that all variants use.
    """
    # Start with the legacy stock field (initial inventory)
    initial_stock = product.stock or 0

    # Calculate total quantity ordered across ALL orders
    total_ordered = db.query(func.coalesce(func.sum(OrderItem.quantity), 0)).filter(
        OrderItem.product_id == product.id
    ).scalar() or 0

    # Available = Initial - Ordered (minimum 0)
    available = max(0, initial_stock - total_ordered)

    return available

@router.get("/{product_id}/image")
async def get_product_image(
    product_id: int,
    db: Session = Depends(get_db)
):
    """Get product image as binary data"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    if not product.image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product has no image"
        )

    return Response(
        content=product.image,
        media_type=product.image_mimetype or "image/jpeg"
    )

@router.get("/media/{media_id}")
async def get_media_file(
    media_id: int,
    db: Session = Depends(get_db)
):
    """Get media file (video/GIF) as binary data - optimized for large files"""
    media = db.query(ProductImage).filter(ProductImage.id == media_id).first()
    if not media:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )

    if not media.image:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media has no data"
        )

    return Response(
        content=media.image,
        media_type=media.image_mimetype or "video/mp4",
        headers={
            "Cache-Control": "public, max-age=31536000",  # Cache for 1 year
            "Accept-Ranges": "bytes"  # Enable partial content support for videos
        }
    )

@router.get("/", response_model=List[ProductResponse])
async def get_products(
    request: Request,
    category: Optional[str] = Query(None, description="Filter by category"),
    collection: Optional[str] = Query(None, description="Filter by collection"),
    search: Optional[str] = Query(None, description="Search in name or description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    db: Session = Depends(get_db)
):
    """Get all products with optional filtering"""
    # Check if user is admin
    is_admin = False
    try:
        auth_header = request.headers.get("authorization", "")
        print(f"GET /api/products/ - Auth header: {auth_header[:50] if auth_header else 'None'}...")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            from app.auth import jwt, SECRET_KEY, ALGORITHM
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                email = payload.get("sub")
                print(f"  Token decoded - email: {email}")
                if email:
                    user = db.query(User).filter(User.email == email).first()
                    if user:
                        print(f"  User found - role: {user.role}")
                        if user.role == UserRole.ADMIN:
                            is_admin = True
                            print(f"  IS ADMIN!")
            except Exception as e:
                print(f"  Token decode error: {e}")
                pass
    except Exception as e:
        print(f"  Auth check error: {e}")
        pass
    print(f"Final is_admin value: {is_admin}")

    query = db.query(Product)

    if category:
        query = query.filter(Product.category == category)

    if collection:
        query = query.filter(Product.collection == collection)

    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (Product.description.ilike(f"%{search}%"))
        )

    products = query.offset(skip).limit(limit).all()

    # Convert to response format
    result = []
    for product in products:
        # Get all product images
        images = get_product_images(product, request=request)
        # For admin users, return actual quantities; for customers, return shared stock
        print(f"GET products list - Product {product.id}: is_admin={is_admin}")
        variants = get_product_variants(product, db, use_actual_quantities=is_admin)
        print(f"  Variants returned: {variants}")
        available_stock = calculate_total_stock(product, db)

        product_dict = {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "price": product.price,
            "category": product.category,
            "collection": product.collection,
            "size_guide": product.size_guide,
            "stock": product.stock,  # Legacy stock field (initial inventory)
            "available_stock": available_stock,  # Calculated available stock
            "images": images,
            "colors": product.colors or [],
            "sizes": product.sizes or [],
            "variants": variants,
            "created_at": product.created_at,
            "discount": {
                "enabled": product.discount_enabled,
                "type": product.discount_type,
                "value": product.discount_value
            } if product.discount_enabled else None,
            "voucher": {
                "enabled": product.voucher_enabled,
                "code": product.voucher_code,
                "discount_type": product.voucher_discount_type,
                "discount_value": product.voucher_discount_value,
                "expiry_date": product.voucher_expiry_date
            } if product.voucher_enabled else None
        }
        result.append(product_dict)

    return result

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: int,
    request: Request,
    color: Optional[str] = Query(None, description="Filter images by color"),
    db: Session = Depends(get_db)
):
    """Get a single product by ID, optionally filtered by color"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Log product view activity (works for authenticated and anonymous users)
    user_id = None
    is_admin = False
    try:
        # Try to extract user from authorization header
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.replace("Bearer ", "")
            from app.auth import jwt, SECRET_KEY, ALGORITHM
            try:
                payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
                email = payload.get("sub")
                if email:
                    user = db.query(User).filter(User.email == email).first()
                    if user:
                        user_id = user.id
                        is_admin = (user.role == UserRole.ADMIN)
            except:
                pass
    except:
        pass

    # Log the product view
    try:
        log_user_activity(
            db=db,
            activity_type=UserActivityType.PRODUCT_VIEW.value,
            user_id=user_id,
            resource_type="product",
            resource_id=product.id,
            description=f"{'User' if user_id else 'Anonymous'} viewed product: {product.name}",
            details={"product_name": product.name, "category": product.category},
            request=request
        )
    except Exception as e:
        print(f"Failed to log product view: {e}")
        pass  # Don't fail if logging fails

    # Get all product images (with color filter if specified)
    images = get_product_images(product, color=color, request=request)
    # For admin users, return actual quantities; for customers, return shared stock
    print(f"GET product {product.id}: is_admin={is_admin}, use_actual_quantities={is_admin}")
    variants = get_product_variants(product, db, use_actual_quantities=is_admin)
    print(f"Returning variants: {variants}")
    available_stock = calculate_total_stock(product, db)

    product_dict = {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "category": product.category,
        "collection": product.collection,
        "size_guide": product.size_guide,
        "stock": product.stock,  # Legacy stock field (initial inventory)
        "available_stock": available_stock,  # Calculated available stock
        "images": images,
        "colors": product.colors or [],
        "sizes": product.sizes or [],
        "variants": variants,
        "created_at": product.created_at,
        "discount": {
            "enabled": product.discount_enabled,
            "type": product.discount_type,
            "value": product.discount_value
        } if product.discount_enabled else None,
        "voucher": {
            "enabled": product.voucher_enabled,
            "code": product.voucher_code,
            "discount_type": product.voucher_discount_type,
            "discount_value": product.voucher_discount_value,
            "expiry_date": product.voucher_expiry_date
        } if product.voucher_enabled else None
    }

    return product_dict

@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    name: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    category: str = Form(...),
    collection: Optional[str] = Form(None),
    size_guide: Optional[str] = Form(None),
    stock: int = Form(...),
    images: List[UploadFile] = File([]),
    colors: Optional[str] = Form(None),
    sizes: Optional[str] = Form(None),
    variants: Optional[str] = Form(None),
    discount: Optional[str] = Form(None),
    voucher: Optional[str] = Form(None),
    image_colors: Optional[str] = Form(None),  # JSON array of colors for each image
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new product (Admin only)"""
    # Parse JSON fields
    colors_list = json.loads(colors) if colors else []
    sizes_list = json.loads(sizes) if sizes else []
    variants_list = json.loads(variants) if variants else []
    size_guide_list = json.loads(size_guide) if size_guide else None
    discount_data = json.loads(discount) if discount else None
    voucher_data = json.loads(voucher) if voucher else None
    image_colors_list = json.loads(image_colors) if image_colors else []

    # Handle voucher code - convert empty string to None to avoid unique constraint violation
    voucher_code = None
    if voucher_data and voucher_data.get('enabled'):
        code = voucher_data.get('code')
        # Convert empty string to None to avoid unique constraint violation
        voucher_code = code if code and code.strip() else None

    new_product = Product(
        name=name,
        description=description,
        price=price,
        category=category,
        collection=collection,
        size_guide=size_guide_list,
        stock=stock,
        colors=colors_list,
        sizes=sizes_list,
        discount_enabled=discount_data.get('enabled', False) if discount_data else False,
        discount_type=discount_data.get('type') if discount_data else None,
        discount_value=discount_data.get('value') if discount_data else None,
        voucher_enabled=voucher_data.get('enabled', False) if voucher_data else False,
        voucher_code=voucher_code,
        voucher_discount_type=voucher_data.get('discount_type') if voucher_data else None,
        voucher_discount_value=voucher_data.get('discount_value') if voucher_data else None,
        voucher_expiry_date=voucher_data.get('expiry_date') if voucher_data else None
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    # Store multiple images/videos/gifs
    for idx, image_file in enumerate(images):
        if image_file and image_file.filename and image_file.filename.strip():
            image_binary = await image_file.read()

            # Determine media type based on MIME type
            mime_type = image_file.content_type or "image/jpeg"
            if mime_type.startswith('video/'):
                media_type = 'video'
            elif mime_type == 'image/gif':
                media_type = 'gif'
            else:
                media_type = 'image'

            # Validate file size for videos and GIFs
            if (media_type == 'video' or media_type == 'gif') and len(image_binary) > MAX_MEDIA_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File {image_file.filename} is too large. Videos and GIFs must be under 10MB."
                )

            # Get color for this image (if provided)
            image_color = image_colors_list[idx] if idx < len(image_colors_list) else None
            # Convert empty string to None
            image_color = image_color if image_color and image_color.strip() else None

            product_image = ProductImage(
                product_id=new_product.id,
                image=image_binary,
                image_mimetype=mime_type,
                display_order=idx,
                media_type=media_type,
                color=image_color
            )
            db.add(product_image)

    # Store product variants (color + size based inventory)
    # Consolidate duplicate variants (same color+size) by summing quantities
    consolidated_variants = {}
    for variant_data in variants_list:
        if variant_data.get('size') and variant_data.get('quantity') is not None:
            # Convert empty string to None for color
            color_value = variant_data.get('color')
            if color_value is not None and not color_value.strip():
                color_value = None

            # Create unique key for this variant
            key = f"{color_value or 'no-color'}_{variant_data['size']}"

            if key in consolidated_variants:
                # Duplicate found - sum the quantities
                consolidated_variants[key]['quantity'] += variant_data['quantity']
                print(f"Consolidated duplicate variant {key}: new qty={consolidated_variants[key]['quantity']}")
            else:
                consolidated_variants[key] = {
                    'color': color_value,
                    'size': variant_data['size'],
                    'quantity': variant_data['quantity']
                }

    # Add consolidated variants
    for variant_data in consolidated_variants.values():
        variant = ProductVariant(
            product_id=new_product.id,
            color=variant_data['color'],
            size=variant_data['size'],
            quantity=variant_data['quantity']
        )
        db.add(variant)

    db.commit()
    db.refresh(new_product)

    # Get all product images
    images_list = get_product_images(new_product, request=None)
    variants_list_response = get_product_variants(new_product, db, use_actual_quantities=True)
    available_stock = calculate_total_stock(new_product, db)

    return {
        "id": new_product.id,
        "name": new_product.name,
        "description": new_product.description,
        "price": new_product.price,
        "category": new_product.category,
        "collection": new_product.collection,
        "size_guide": new_product.size_guide,
        "stock": new_product.stock,  # Legacy stock field (initial inventory)
        "available_stock": available_stock,  # Calculated available stock
        "images": images_list,
        "colors": new_product.colors or [],
        "sizes": new_product.sizes or [],
        "variants": variants_list_response,
        "created_at": new_product.created_at,
        "discount": {
            "enabled": new_product.discount_enabled,
            "type": new_product.discount_type,
            "value": new_product.discount_value
        } if new_product.discount_enabled else None,
        "voucher": {
            "enabled": new_product.voucher_enabled,
            "code": new_product.voucher_code,
            "discount_type": new_product.voucher_discount_type,
            "discount_value": new_product.voucher_discount_value,
            "expiry_date": new_product.voucher_expiry_date
        } if new_product.voucher_enabled else None
    }

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    category: Optional[str] = Form(None),
    collection: Optional[str] = Form(None),
    size_guide: Optional[str] = Form(None),
    stock: Optional[int] = Form(None),
    images: List[UploadFile] = File([]),
    colors: Optional[str] = Form(None),
    sizes: Optional[str] = Form(None),
    variants: Optional[str] = Form(None),
    discount: Optional[str] = Form(None),
    voucher: Optional[str] = Form(None),
    replace_images: bool = Form(False),  # If true, replace all images; if false, add to existing
    image_colors: Optional[str] = Form(None),  # JSON array of colors for each NEW image
    existing_image_colors: Optional[str] = Form(None),  # JSON object mapping image IDs to colors for existing images
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update a product (Admin only)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Update fields
    if name is not None:
        product.name = name
    if description is not None:
        product.description = description
    if price is not None:
        product.price = price
    if category is not None:
        product.category = category
    if collection is not None:
        product.collection = collection
    if size_guide is not None:
        try:
            product.size_guide = json.loads(size_guide) if size_guide else None
        except json.JSONDecodeError:
            print(f"Failed to parse size_guide: {size_guide}")
            product.size_guide = None
    if stock is not None:
        product.stock = stock

    # Parse and update discount
    if discount:
        discount_data = json.loads(discount)
        product.discount_enabled = discount_data.get('enabled', False)
        product.discount_type = discount_data.get('type')
        product.discount_value = discount_data.get('value')

    # Parse and update voucher
    if voucher:
        voucher_data = json.loads(voucher)
        product.voucher_enabled = voucher_data.get('enabled', False)
        # Convert empty string to None to avoid unique constraint violation
        code = voucher_data.get('code')
        product.voucher_code = code if code and code.strip() else None
        product.voucher_discount_type = voucher_data.get('discount_type')
        product.voucher_discount_value = voucher_data.get('discount_value')
        product.voucher_expiry_date = voucher_data.get('expiry_date')

    # Parse and update colors if provided
    if colors is not None:
        try:
            product.colors = json.loads(colors) if colors else []
        except json.JSONDecodeError:
            print(f"Failed to parse colors: {colors}")
            product.colors = []

    # Parse and update sizes if provided
    if sizes is not None:
        try:
            product.sizes = json.loads(sizes) if sizes else []
        except json.JSONDecodeError:
            print(f"Failed to parse sizes: {sizes}")
            product.sizes = []

    # Update product variants if provided
    if variants is not None:
        try:
            variants_list = json.loads(variants) if variants else []
            print(f"Updating variants: {variants_list}")  # Debug log

            # Consolidate duplicate variants (same color+size) by summing quantities
            consolidated_variants = {}
            for variant_data in variants_list:
                if variant_data.get('size') and variant_data.get('quantity') is not None:
                    # Convert empty string to None for color
                    color_value = variant_data.get('color')
                    if color_value is not None and not color_value.strip():
                        color_value = None

                    # Create unique key for this variant
                    key = f"{color_value or 'no-color'}_{variant_data['size']}"

                    if key in consolidated_variants:
                        # Duplicate found - sum the quantities
                        consolidated_variants[key]['quantity'] += variant_data['quantity']
                        print(f"Consolidated duplicate variant {key}: new qty={consolidated_variants[key]['quantity']}")
                    else:
                        consolidated_variants[key] = {
                            'color': color_value,
                            'size': variant_data['size'],
                            'quantity': variant_data['quantity']
                        }

            # Delete existing variants
            db.query(ProductVariant).filter(ProductVariant.product_id == product_id).delete()

            # Add consolidated variants
            for variant_data in consolidated_variants.values():
                print(f"Creating variant: color={variant_data['color']}, size={variant_data['size']}, qty={variant_data['quantity']}")  # Debug log
                variant = ProductVariant(
                    product_id=product_id,
                    color=variant_data['color'],
                    size=variant_data['size'],
                    quantity=variant_data['quantity']
                )
                db.add(variant)
        except json.JSONDecodeError as e:
            print(f"Failed to parse variants: {variants}, Error: {e}")
        except Exception as e:
            print(f"Error creating variants: {e}")
            raise

    # Update colors of existing images
    if existing_image_colors:
        try:
            colors_map = json.loads(existing_image_colors)  # {image_id: color}
            print(f"Received existing_image_colors: {colors_map}")

            for image_id_str, new_color in colors_map.items():
                try:
                    image_id = int(image_id_str)
                    img = db.query(ProductImage).filter(
                        ProductImage.id == image_id,
                        ProductImage.product_id == product_id
                    ).first()

                    if img:
                        img.color = new_color if new_color else None
                        print(f"Updated color for image {img.id}: {img.color}")
                    else:
                        print(f"Image {image_id} not found for product {product_id}")
                except ValueError:
                    print(f"Invalid image ID: {image_id_str}")

            # Commit the color updates
            db.commit()
            print("Committed existing image color updates")

        except Exception as e:
            print(f"Error updating existing image colors: {e}")
            import traceback
            traceback.print_exc()

    # Handle images update
    if images and len(images) > 0 and images[0].filename:
        # Parse image colors
        image_colors_list = json.loads(image_colors) if image_colors else []

        if replace_images:
            # Delete existing images
            db.query(ProductImage).filter(ProductImage.product_id == product_id).delete()

        # Get current max display_order
        max_order = db.query(func.max(ProductImage.display_order)).filter(ProductImage.product_id == product_id).scalar() or -1

        # Add new images/videos/gifs
        for idx, image_file in enumerate(images):
            if image_file and image_file.filename and image_file.filename.strip():
                image_binary = await image_file.read()

                # Determine media type based on MIME type
                mime_type = image_file.content_type or "image/jpeg"
                if mime_type.startswith('video/'):
                    media_type = 'video'
                elif mime_type == 'image/gif':
                    media_type = 'gif'
                else:
                    media_type = 'image'

                # Validate file size for videos and GIFs
                if (media_type == 'video' or media_type == 'gif') and len(image_binary) > MAX_MEDIA_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File {image_file.filename} is too large. Videos and GIFs must be under 10MB."
                    )

                # Get color for this image (if provided)
                image_color = image_colors_list[idx] if idx < len(image_colors_list) else None
                # Convert empty string to None
                image_color = image_color if image_color and image_color.strip() else None

                product_image = ProductImage(
                    product_id=product_id,
                    image=image_binary,
                    image_mimetype=mime_type,
                    display_order=max_order + idx + 1,
                    media_type=media_type,
                    color=image_color
                )
                db.add(product_image)

    db.commit()
    db.refresh(product)

    # Get all product images
    images_list = get_product_images(product, request=None)
    variants_list_response = get_product_variants(product, db, use_actual_quantities=True)
    available_stock = calculate_total_stock(product, db)

    return {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "category": product.category,
        "collection": product.collection,
        "size_guide": product.size_guide,
        "stock": product.stock,  # Legacy stock field (initial inventory)
        "available_stock": available_stock,  # Calculated available stock
        "images": images_list,
        "colors": product.colors or [],
        "sizes": product.sizes or [],
        "variants": variants_list_response,
        "created_at": product.created_at,
        "discount": {
            "enabled": product.discount_enabled,
            "type": product.discount_type,
            "value": product.discount_value
        } if product.discount_enabled else None,
        "voucher": {
            "enabled": product.voucher_enabled,
            "code": product.voucher_code,
            "discount_type": product.voucher_discount_type,
            "discount_value": product.voucher_discount_value,
            "expiry_date": product.voucher_expiry_date
        } if product.voucher_enabled else None
    }

@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(
    product_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a product (Admin only)"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    db.delete(product)
    db.commit()
    return None

@router.get("/categories/list", response_model=List[str])
async def get_categories(db: Session = Depends(get_db)):
    """Get list of unique product categories from database"""
    # Get distinct categories from the products table
    categories = db.query(Product.category).distinct().all()
    return [cat[0] for cat in categories if cat[0]]  # Return list of category strings

@router.get("/collections/list", response_model=List[str])
async def get_collections(db: Session = Depends(get_db)):
    """Get list of unique product collections from database"""
    # Get distinct collections from the products table
    collections = db.query(Product.collection).distinct().filter(
        Product.collection.isnot(None),
        Product.collection != ''  # Filter out empty strings
    ).all()
    return [col[0] for col in collections if col[0] and col[0].strip()]  # Return list of non-empty collection strings

@router.get("/bestsellers/", response_model=List[ProductResponse])
async def get_bestsellers(
    request: Request,
    limit: int = Query(6, le=20, description="Number of bestsellers to return"),
    db: Session = Depends(get_db)
):
    """Get bestseller products based on completed orders (successful payments)"""
    # Query to get products ordered by total quantity sold in completed orders
    bestseller_query = (
        db.query(
            Product,
            func.sum(OrderItem.quantity).label('total_sold')
        )
        .join(OrderItem, Product.id == OrderItem.product_id)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(
            Order.status == OrderStatus.COMPLETED,
            Order.payment_status == "completed"
        )
        .group_by(Product.id)
        .order_by(desc('total_sold'))
        .limit(limit)
    )

    bestsellers = bestseller_query.all()

    # If no orders yet, fall back to newest products with stock
    if not bestsellers:
        products = db.query(Product).filter(Product.stock > 0).order_by(desc(Product.created_at)).limit(limit).all()
        bestsellers = [(product, 0) for product in products]

    # Convert to response format
    result = []
    for product, total_sold in bestsellers:
        # Get all product images
        images = get_product_images(product, request=request)
        variants = get_product_variants(product, db)
        available_stock = calculate_total_stock(product, db)

        product_dict = {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "price": product.price,
            "category": product.category,
            "collection": product.collection,
            "size_guide": product.size_guide,
            "stock": product.stock,  # Legacy stock field (initial inventory)
            "available_stock": available_stock,  # Calculated available stock
            "images": images,
            "colors": product.colors or [],
            "sizes": product.sizes or [],
            "variants": variants,
            "created_at": product.created_at,
            "discount": {
                "enabled": product.discount_enabled,
                "type": product.discount_type,
                "value": product.discount_value
            } if product.discount_enabled else None,
            "voucher": {
                "enabled": product.voucher_enabled,
                "code": product.voucher_code,
                "discount_type": product.voucher_discount_type,
                "discount_value": product.voucher_discount_value,
                "expiry_date": product.voucher_expiry_date
            } if product.voucher_enabled else None
        }
        result.append(product_dict)

    return result

@router.get("/new-arrivals/", response_model=List[ProductResponse])
async def get_new_arrivals(
    request: Request,
    limit: int = Query(6, le=20, description="Number of new arrivals to return"),
    db: Session = Depends(get_db)
):
    """Get new arrival products (sorted by creation date)"""
    products = db.query(Product).order_by(Product.created_at.desc()).limit(limit).all()

    # Convert to response format
    result = []
    for product in products:
        # Get all product images
        images = get_product_images(product, request=request)
        variants = get_product_variants(product, db)
        available_stock = calculate_total_stock(product, db)

        product_dict = {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "price": product.price,
            "category": product.category,
            "collection": product.collection,
            "size_guide": product.size_guide,
            "stock": product.stock,  # Legacy stock field (initial inventory)
            "available_stock": available_stock,  # Calculated available stock
            "images": images,
            "colors": product.colors or [],
            "sizes": product.sizes or [],
            "variants": variants,
            "created_at": product.created_at,
            "discount": {
                "enabled": product.discount_enabled,
                "type": product.discount_type,
                "value": product.discount_value
            } if product.discount_enabled else None,
            "voucher": {
                "enabled": product.voucher_enabled,
                "code": product.voucher_code,
                "discount_type": product.voucher_discount_type,
                "discount_value": product.voucher_discount_value,
                "expiry_date": product.voucher_expiry_date
            } if product.voucher_enabled else None
        }
        result.append(product_dict)

    return result
