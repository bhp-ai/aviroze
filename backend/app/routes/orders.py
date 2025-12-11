from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from app.database import get_db
from app.db_models import Order, OrderItem, Product, User, OrderStatus
from app.auth import get_current_user, get_current_admin_user
import stripe
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/orders", tags=["Orders"])

# Initialize Stripe
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

# Pydantic schemas
class OrderItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    quantity: int
    price: float
    product_image: Optional[str] = None

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    user_id: int
    status: str
    total_amount: float
    payment_method: Optional[str]
    payment_status: str
    shipping_address: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    items: List[OrderItemResponse]

    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: OrderStatus

# Stripe webhook endpoint
@router.post("/webhook")
async def stripe_webhook(
    request: dict,
    stripe_signature: str = Header(None, alias="stripe-signature"),
    db: Session = Depends(get_db)
):
    """
    Stripe webhook to handle payment events.
    This creates orders in the database when payments are successful.
    """
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if not webhook_secret:
        # For development, process without verification
        event = request
    else:
        # Verify webhook signature in production
        try:
            event = stripe.Webhook.construct_event(
                payload=request,
                sig_header=stripe_signature,
                secret=webhook_secret
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Webhook verification failed: {str(e)}"
            )

    # Handle checkout.session.completed event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']

        # Extract user_id from metadata
        user_id = session.get('metadata', {}).get('user_id')
        cart_data = session.get('metadata', {}).get('cart_data')

        if user_id and cart_data:
            import json
            cart_items = json.loads(cart_data)

            # Create order
            total_amount = session['amount_total'] / 100  # Convert from cents

            new_order = Order(
                user_id=int(user_id),
                status=OrderStatus.PROCESSING,
                total_amount=total_amount,
                payment_method="stripe",
                payment_status="completed",
                shipping_address=session.get('customer_details', {}).get('address', '')
            )

            db.add(new_order)
            db.flush()  # Get the order ID

            # Create order items
            for item in cart_items:
                product = db.query(Product).filter(Product.id == item['product_id']).first()
                if product:
                    order_item = OrderItem(
                        order_id=new_order.id,
                        product_id=item['product_id'],
                        quantity=item['quantity'],
                        price=item['price']
                    )
                    db.add(order_item)

                    # Update product stock
                    product.stock = max(0, product.stock - item['quantity'])

            db.commit()

    return {"status": "success"}

# Get user's orders
@router.get("/my-orders", response_model=List[OrderResponse])
async def get_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all orders for the current user"""
    orders = db.query(Order).filter(
        Order.user_id == current_user.id
    ).options(
        joinedload(Order.items).joinedload(OrderItem.product)
    ).order_by(Order.created_at.desc()).all()

    result = []
    for order in orders:
        order_items = []
        for item in order.items:
            # Get first image if available
            image_url = None
            if item.product and item.product.images:
                from base64 import b64encode
                img = item.product.images[0]
                image_url = f"data:{img.image_mimetype};base64,{b64encode(img.image).decode('utf-8')}"
            elif item.product and item.product.image:
                from base64 import b64encode
                image_url = f"data:{item.product.image_mimetype or 'image/jpeg'};base64,{b64encode(item.product.image).decode('utf-8')}"

            order_items.append(OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name if item.product else "Unknown Product",
                quantity=item.quantity,
                price=item.price,
                product_image=image_url
            ))

        result.append(OrderResponse(
            id=order.id,
            user_id=order.user_id,
            status=order.status.value,
            total_amount=order.total_amount,
            payment_method=order.payment_method,
            payment_status=order.payment_status,
            shipping_address=order.shipping_address,
            notes=order.notes,
            created_at=order.created_at,
            updated_at=order.updated_at,
            items=order_items
        ))

    return result

# Get single order (user must own it)
@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific order by ID"""
    order = db.query(Order).filter(
        Order.id == order_id,
        Order.user_id == current_user.id
    ).options(
        joinedload(Order.items).joinedload(OrderItem.product)
    ).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    # Build response
    order_items = []
    for item in order.items:
        image_url = None
        if item.product and item.product.images:
            from base64 import b64encode
            img = item.product.images[0]
            image_url = f"data:{img.image_mimetype};base64,{b64encode(img.image).decode('utf-8')}"
        elif item.product and item.product.image:
            from base64 import b64encode
            image_url = f"data:{item.product.image_mimetype or 'image/jpeg'};base64,{b64encode(item.product.image).decode('utf-8')}"

        order_items.append(OrderItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=item.product.name if item.product else "Unknown Product",
            quantity=item.quantity,
            price=item.price,
            product_image=image_url
        ))

    return OrderResponse(
        id=order.id,
        user_id=order.user_id,
        status=order.status.value,
        total_amount=order.total_amount,
        payment_method=order.payment_method,
        payment_status=order.payment_status,
        shipping_address=order.shipping_address,
        notes=order.notes,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=order_items
    )

# Admin: Get all orders
@router.get("/admin/all", response_model=List[OrderResponse])
async def get_all_orders(
    skip: int = 0,
    limit: int = 100,
    status_filter: Optional[str] = None,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all orders (Admin only)"""
    query = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product)
    )

    if status_filter:
        query = query.filter(Order.status == status_filter)

    orders = query.order_by(Order.created_at.desc()).offset(skip).limit(limit).all()

    result = []
    for order in orders:
        order_items = []
        for item in order.items:
            image_url = None
            if item.product and item.product.images:
                from base64 import b64encode
                img = item.product.images[0]
                image_url = f"data:{img.image_mimetype};base64,{b64encode(img.image).decode('utf-8')}"
            elif item.product and item.product.image:
                from base64 import b64encode
                image_url = f"data:{item.product.image_mimetype or 'image/jpeg'};base64,{b64encode(item.product.image).decode('utf-8')}"

            order_items.append(OrderItemResponse(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name if item.product else "Unknown Product",
                quantity=item.quantity,
                price=item.price,
                product_image=image_url
            ))

        result.append(OrderResponse(
            id=order.id,
            user_id=order.user_id,
            status=order.status.value,
            total_amount=order.total_amount,
            payment_method=order.payment_method,
            payment_status=order.payment_status,
            shipping_address=order.shipping_address,
            notes=order.notes,
            created_at=order.created_at,
            updated_at=order.updated_at,
            items=order_items
        ))

    return result

# Admin: Update order status
@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: int,
    status_update: OrderStatusUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update order status (Admin only)"""
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    order.status = status_update.status
    db.commit()

    return {"message": "Order status updated successfully", "status": status_update.status.value}
