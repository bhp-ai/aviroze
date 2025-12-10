from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from app.database import get_db
from app.db_models import Product, User, Order, OrderItem, OrderStatus
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.auth import get_current_user, get_current_admin_user

router = APIRouter(prefix="/api/products", tags=["Products"])

@router.get("/", response_model=List[ProductResponse])
async def get_products(
    category: Optional[str] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in name or description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    db: Session = Depends(get_db)
):
    """Get all products with optional filtering"""
    query = db.query(Product)

    if category:
        query = query.filter(Product.category == category)

    if search:
        query = query.filter(
            (Product.name.ilike(f"%{search}%")) |
            (Product.description.ilike(f"%{search}%"))
        )

    products = query.offset(skip).limit(limit).all()

    # Convert to response format
    result = []
    for product in products:
        product_dict = {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "price": product.price,
            "category": product.category,  # Now a string, no need to convert
            "stock": product.stock,
            "image": product.image,
            "colors": [],  # TODO: Add colors from product_colors table
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
    db: Session = Depends(get_db)
):
    """Get a single product by ID"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    product_dict = {
        "id": product.id,
        "name": product.name,
        "description": product.description,
        "price": product.price,
        "category": product.category,  # Now a string, no need to convert
        "stock": product.stock,
        "image": product.image,
        "colors": [],
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
    product_data: ProductCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new product (Admin only)"""
    new_product = Product(
        name=product_data.name,
        description=product_data.description,
        price=product_data.price,
        category=product_data.category,
        stock=product_data.stock,
        image=product_data.image,
        discount_enabled=product_data.discount.enabled if product_data.discount else False,
        discount_type=product_data.discount.type if product_data.discount else None,
        discount_value=product_data.discount.value if product_data.discount else None,
        voucher_enabled=product_data.voucher.enabled if product_data.voucher else False,
        voucher_code=product_data.voucher.code if product_data.voucher else None,
        voucher_discount_type=product_data.voucher.discount_type if product_data.voucher else None,
        voucher_discount_value=product_data.voucher.discount_value if product_data.voucher else None,
        voucher_expiry_date=product_data.voucher.expiry_date if product_data.voucher else None
    )

    db.add(new_product)
    db.commit()
    db.refresh(new_product)

    return new_product

@router.put("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
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
    if product_data.name is not None:
        product.name = product_data.name
    if product_data.description is not None:
        product.description = product_data.description
    if product_data.price is not None:
        product.price = product_data.price
    if product_data.category is not None:
        product.category = product_data.category
    if product_data.stock is not None:
        product.stock = product_data.stock
    if product_data.image is not None:
        product.image = product_data.image

    if product_data.discount:
        product.discount_enabled = product_data.discount.enabled
        product.discount_type = product_data.discount.type
        product.discount_value = product_data.discount.value

    if product_data.voucher:
        product.voucher_enabled = product_data.voucher.enabled
        product.voucher_code = product_data.voucher.code
        product.voucher_discount_type = product_data.voucher.discount_type
        product.voucher_discount_value = product_data.voucher.discount_value
        product.voucher_expiry_date = product_data.voucher.expiry_date

    db.commit()
    db.refresh(product)

    return product

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

@router.get("/bestsellers/", response_model=List[ProductResponse])
async def get_bestsellers(
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
        product_dict = {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "price": product.price,
            "category": product.category,
            "stock": product.stock,
            "image": product.image,
            "colors": [],
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
    limit: int = Query(6, le=20, description="Number of new arrivals to return"),
    db: Session = Depends(get_db)
):
    """Get new arrival products (sorted by creation date)"""
    products = db.query(Product).order_by(Product.created_at.desc()).limit(limit).all()

    # Convert to response format
    result = []
    for product in products:
        product_dict = {
            "id": product.id,
            "name": product.name,
            "description": product.description,
            "price": product.price,
            "category": product.category,  # Now a string, no need to convert
            "stock": product.stock,
            "image": product.image,
            "colors": [],
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
