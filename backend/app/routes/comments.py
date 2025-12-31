from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.db_models import ProductComment, Product, User, Order, OrderItem
from app.schemas.comment import CommentCreate, CommentUpdate, CommentResponse, CommentWithProduct
from app.auth import get_current_user, get_current_admin_user

router = APIRouter(prefix="/api/comments", tags=["Comments"])

@router.get("/eligible-purchases/{product_id}")
async def get_eligible_purchases(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all eligible purchases for reviewing a specific product"""
    # Get all completed/delivered orders for this user containing this product
    orders = db.query(Order).filter(
        Order.user_id == current_user.id,
        Order.status.in_(['completed', 'delivered'])
    ).all()

    eligible_purchases = []
    for order in orders:
        # Check if this order contains the product
        order_item = db.query(OrderItem).filter(
            OrderItem.order_id == order.id,
            OrderItem.product_id == product_id
        ).first()

        if order_item:
            # Check if user already reviewed this order+product combination
            existing_review = db.query(ProductComment).filter(
                ProductComment.user_id == current_user.id,
                ProductComment.product_id == product_id,
                ProductComment.order_id == order.id
            ).first()

            eligible_purchases.append({
                "order_id": order.id,
                "purchase_date": order.created_at,
                "has_reviewed": existing_review is not None
            })

    return eligible_purchases

@router.get("/", response_model=List[CommentResponse])
async def get_comments(
    product_id: Optional[int] = Query(None, description="Filter by product ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    db: Session = Depends(get_db)
):
    """Get all comments with optional product filter"""
    query = db.query(ProductComment)

    if product_id:
        query = query.filter(ProductComment.product_id == product_id)

    comments = query.offset(skip).limit(limit).all()

    # Convert to response format with user info
    result = []
    for comment in comments:
        user = db.query(User).filter(User.id == comment.user_id).first()
        order = None
        purchase_date = None
        if comment.order_id:
            order = db.query(Order).filter(Order.id == comment.order_id).first()
            if order:
                purchase_date = order.created_at

        comment_dict = {
            "id": comment.id,
            "product_id": comment.product_id,
            "user_id": comment.user_id,
            "order_id": comment.order_id,
            "username": user.username if user else "Unknown",
            "user_email": user.email if user else "unknown@example.com",
            "rating": comment.rating,
            "comment": comment.comment,
            "created_at": comment.created_at,
            "updated_at": comment.updated_at,
            "purchase_date": purchase_date
        }
        result.append(comment_dict)

    return result

@router.get("/admin/all", response_model=List[CommentWithProduct])
async def get_all_comments_admin(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get all comments with product info (Admin only)"""
    comments = db.query(ProductComment).offset(skip).limit(limit).all()

    # Convert to response format with user and product info
    result = []
    for comment in comments:
        user = db.query(User).filter(User.id == comment.user_id).first()
        product = db.query(Product).filter(Product.id == comment.product_id).first()

        comment_dict = {
            "id": comment.id,
            "product_id": comment.product_id,
            "product_name": product.name if product else "Unknown",
            "product_category": product.category.value if product and hasattr(product.category, 'value') else "Unknown",
            "user_id": comment.user_id,
            "username": user.username if user else "Unknown",
            "user_email": user.email if user else "unknown@example.com",
            "rating": comment.rating,
            "comment": comment.comment,
            "created_at": comment.created_at,
            "updated_at": comment.updated_at
        }
        result.append(comment_dict)

    return result

@router.get("/{comment_id}", response_model=CommentResponse)
async def get_comment(
    comment_id: int,
    db: Session = Depends(get_db)
):
    """Get a single comment by ID"""
    comment = db.query(ProductComment).filter(ProductComment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    user = db.query(User).filter(User.id == comment.user_id).first()

    comment_dict = {
        "id": comment.id,
        "product_id": comment.product_id,
        "user_id": comment.user_id,
        "username": user.username if user else "Unknown",
        "user_email": user.email if user else "unknown@example.com",
        "rating": comment.rating,
        "comment": comment.comment,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at
    }

    return comment_dict

@router.post("/", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
async def create_comment(
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new comment (Authenticated users only)"""
    # Verify product exists
    product = db.query(Product).filter(Product.id == comment_data.product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Validate rating
    if comment_data.rating < 1 or comment_data.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )

    # If order_id is provided, verify it belongs to user and contains the product
    purchase_date = None
    if comment_data.order_id:
        order = db.query(Order).filter(
            Order.id == comment_data.order_id,
            Order.user_id == current_user.id
        ).first()

        if not order:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Order not found or does not belong to you"
            )

        # Check if order status is completed/delivered
        if order.status.lower() not in ['completed', 'delivered']:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only review products from completed orders"
            )

        # Verify product is in the order
        order_item = db.query(OrderItem).filter(
            OrderItem.order_id == comment_data.order_id,
            OrderItem.product_id == comment_data.product_id
        ).first()

        if not order_item:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Product not found in this order"
            )

        # Check if user already reviewed this order+product combination
        existing_review = db.query(ProductComment).filter(
            ProductComment.user_id == current_user.id,
            ProductComment.product_id == comment_data.product_id,
            ProductComment.order_id == comment_data.order_id
        ).first()

        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already reviewed this product for this purchase"
            )

        purchase_date = order.created_at

    new_comment = ProductComment(
        product_id=comment_data.product_id,
        user_id=current_user.id,
        order_id=comment_data.order_id,
        rating=comment_data.rating,
        comment=comment_data.comment
    )

    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    comment_dict = {
        "id": new_comment.id,
        "product_id": new_comment.product_id,
        "user_id": new_comment.user_id,
        "order_id": new_comment.order_id,
        "username": current_user.username,
        "user_email": current_user.email,
        "rating": new_comment.rating,
        "comment": new_comment.comment,
        "created_at": new_comment.created_at,
        "updated_at": new_comment.updated_at,
        "purchase_date": purchase_date
    }

    return comment_dict

@router.put("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: int,
    comment_data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a comment (Owner or Admin only)"""
    comment = db.query(ProductComment).filter(ProductComment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    # Check if user owns the comment or is admin
    if comment.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to edit this comment"
        )

    # Update fields
    if comment_data.rating is not None:
        if comment_data.rating < 1 or comment_data.rating > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rating must be between 1 and 5"
            )
        comment.rating = comment_data.rating

    if comment_data.comment is not None:
        comment.comment = comment_data.comment

    db.commit()
    db.refresh(comment)

    user = db.query(User).filter(User.id == comment.user_id).first()

    comment_dict = {
        "id": comment.id,
        "product_id": comment.product_id,
        "user_id": comment.user_id,
        "username": user.username if user else "Unknown",
        "user_email": user.email if user else "unknown@example.com",
        "rating": comment.rating,
        "comment": comment.comment,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at
    }

    return comment_dict

@router.delete("/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a comment (Owner or Admin only)"""
    comment = db.query(ProductComment).filter(ProductComment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )

    # Check if user owns the comment or is admin
    if comment.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this comment"
        )

    db.delete(comment)
    db.commit()
    return None
