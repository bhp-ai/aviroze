from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from pydantic import BaseModel
from app.database import get_db
from app.db_models import Product, User
from app.auth import get_current_user
import stripe
import os
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/api/payments", tags=["Payments"])

# Initialize Stripe with secret key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

class CartItem(BaseModel):
    product_id: int
    quantity: int
    selected_size: str | None = None
    selected_color: str | None = None

class CheckoutRequest(BaseModel):
    items: List[CartItem]

@router.post("/create-checkout-session")
async def create_checkout_session(
    checkout_request: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a Stripe checkout session.
    Security: Prices are fetched from database using product IDs to prevent manipulation.
    """
    try:
        # Validate that we have items
        if not checkout_request.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cart is empty"
            )

        # Build line items by fetching actual prices from database
        line_items = []
        for item in checkout_request.items:
            # Fetch product from database to get actual price
            product = db.query(Product).filter(Product.id == item.product_id).first()

            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID {item.product_id} not found"
                )

            # Check stock availability
            if product.stock < item.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for {product.name}"
                )

            # Calculate the actual price with discounts
            price = product.price

            # Apply discount if enabled
            if product.discount_enabled and product.discount_value:
                if product.discount_type == 'percentage':
                    price = price * (1 - product.discount_value / 100)
                elif product.discount_type == 'fixed':
                    price = max(0, price - product.discount_value)

            # Convert IDR to USD (approximate rate: 1 USD = 15,800 IDR)
            # Then convert to cents for Stripe (multiply by 100)
            price_in_usd = price / 15800  # Convert IDR to USD
            unit_amount_cents = int(price_in_usd * 100)  # Convert to cents

            # Ensure minimum Stripe amount (50 cents)
            unit_amount_cents = max(50, unit_amount_cents)

            # Build product name with variants
            product_name = product.name
            if item.selected_size:
                product_name += f" - Size: {item.selected_size}"
            if item.selected_color:
                product_name += f" - Color: {item.selected_color}"

            # Prepare product data for Stripe
            product_data = {
                "name": product_name,
                "description": product.description[:100] if product.description else "",
            }

            # Note: Stripe requires publicly accessible image URLs
            # If using localhost, images won't display in Stripe checkout
            # Consider using ngrok or deploying to access images in Stripe
            backend_url = os.getenv("BACKEND_URL", "http://localhost:8000")

            # Try to add product images if backend is publicly accessible
            if not (backend_url.startswith("http://localhost") or backend_url.startswith("http://127.0.0.1")):
                if product.images and len(product.images) > 0:
                    product_data["images"] = [f"{backend_url}/api/products/{product.id}/image"]
                elif product.image:
                    product_data["images"] = [f"{backend_url}/api/products/{product.id}/image"]

            line_items.append({
                "price_data": {
                    "currency": "usd",
                    "product_data": product_data,
                    "unit_amount": unit_amount_cents,
                },
                "quantity": item.quantity,
            })

        # Add shipping as a line item (50,000 IDR ≈ $3.16 USD)
        shipping_in_cents = int((50000 / 15800) * 100)  # Convert IDR to USD cents
        line_items.append({
            "price_data": {
                "currency": "usd",
                "product_data": {
                    "name": "Shipping",
                    "description": "Standard shipping",
                },
                "unit_amount": max(50, shipping_in_cents),  # Ensure minimum
            },
            "quantity": 1,
        })

        # Prepare cart data for webhook (store prices for order creation)
        import json
        cart_data = []
        for item in checkout_request.items:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            if product:
                price = product.price
                if product.discount_enabled and product.discount_value:
                    if product.discount_type == 'percentage':
                        price = price * (1 - product.discount_value / 100)
                    elif product.discount_type == 'fixed':
                        price = max(0, price - product.discount_value)

                cart_data.append({
                    "product_id": item.product_id,
                    "quantity": item.quantity,
                    "price": price,
                    "selected_size": item.selected_size,
                    "selected_color": item.selected_color
                })

        # Create Stripe checkout session
        # Use environment variables or configuration for URLs
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=line_items,
            mode="payment",
            success_url=f"{frontend_url}/checkout/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{frontend_url}/checkout/cancel",
            customer_email=current_user.email,
            metadata={
                "user_id": str(current_user.id),
                "user_email": current_user.email,
                "cart_data": json.dumps(cart_data)
            }
        )

        return {
            "checkout_url": checkout_session.url,
            "session_id": checkout_session.id
        }

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}"
        )

@router.get("/session/{session_id}")
async def get_session_status(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the status of a checkout session and create order if paid"""
    try:
        print(f"[DEBUG] Retrieving session: {session_id}")
        session = stripe.checkout.Session.retrieve(session_id)
        print(f"[DEBUG] Session payment status: {session.payment_status}")

        # If payment is successful and order doesn't exist yet, create it
        if session.payment_status == 'paid':
            print(f"[DEBUG] Payment is paid, checking for existing order...")
            # Check if order already exists for this session
            from app.db_models import Order, OrderItem, Product, OrderStatus
            existing_order = db.query(Order).filter(
                Order.user_id == current_user.id,
                Order.payment_method == f"stripe_{session_id}"
            ).first()

            if existing_order:
                print(f"[DEBUG] Order already exists: {existing_order.id}")
            else:
                print(f"[DEBUG] Creating new order...")
                # Get cart data from session metadata
                cart_data_str = session.metadata.get('cart_data')
                if cart_data_str:
                    import json
                    cart_items = json.loads(cart_data_str)
                    print(f"[DEBUG] Cart items: {len(cart_items)}")

                    # Calculate total in IDR from cart items (not from Stripe which is in USD)
                    items_total = sum(item['price'] * item['quantity'] for item in cart_items)
                    shipping_cost = 50000  # IDR
                    total_amount = items_total + shipping_cost

                    # Get shipping address
                    shipping_address = ""
                    if session.customer_details and session.customer_details.get('address'):
                        addr = session.customer_details['address']
                        parts = []
                        if addr.get('line1'):
                            parts.append(addr['line1'])
                        if addr.get('line2'):
                            parts.append(addr['line2'])
                        if addr.get('city'):
                            parts.append(addr['city'])
                        if addr.get('state'):
                            parts.append(addr['state'])
                        if addr.get('postal_code'):
                            parts.append(addr['postal_code'])
                        if addr.get('country'):
                            parts.append(addr['country'])
                        shipping_address = ", ".join(parts) if parts else "No address provided"
                    else:
                        shipping_address = f"Email: {session.customer_email}"

                    # Create order
                    print(f"[DEBUG] Creating order for user {current_user.id}")
                    new_order = Order(
                        user_id=current_user.id,
                        status=OrderStatus.PROCESSING,
                        total_amount=total_amount,
                        payment_method=f"stripe_{session_id}",  # Store session ID to prevent duplicates
                        payment_status="completed",
                        shipping_address=shipping_address
                    )

                    db.add(new_order)
                    db.flush()  # Get the order ID
                    print(f"[DEBUG] Order created with ID: {new_order.id}")

                    # Create order items and update stock
                    for item in cart_items:
                        product = db.query(Product).filter(Product.id == item['product_id']).first()
                        if product:
                            print(f"[DEBUG] Adding order item: {product.name} x{item['quantity']}")
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
                    print(f"[DEBUG] Order committed successfully!")
                else:
                    print(f"[DEBUG] No cart data found in session metadata")

        return {
            "status": session.payment_status,
            "customer_email": session.customer_email
        }
    except stripe.error.StripeError as e:
        print(f"[ERROR] Stripe error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stripe error: {str(e)}"
        )
    except Exception as e:
        print(f"[ERROR] Unexpected error in get_session_status: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}"
        )
