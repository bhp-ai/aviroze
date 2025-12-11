from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database import get_db
from app.db_models import User, Product, ProductComment, Order, OrderStatus
from app.auth import get_current_admin_user
from typing import Dict, List

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/dashboard", response_model=Dict)
async def get_dashboard_stats(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get dashboard statistics (Admin only)"""

    # Total users count
    total_users = db.query(User).filter(User.role == "user").count()

    # Total admin count
    total_admins = db.query(User).filter(User.role == "admin").count()

    # Total products count
    total_products = db.query(Product).count()

    # Total comments/reviews count
    total_comments = db.query(ProductComment).count()

    # Average rating
    avg_rating_result = db.query(func.avg(ProductComment.rating)).scalar()
    avg_rating = round(float(avg_rating_result), 2) if avg_rating_result else 0.0

    # Products with low stock (less than 10)
    low_stock_products = db.query(Product).filter(Product.stock < 10).count()

    # Products by category
    products_by_category = db.query(
        Product.category,
        func.count(Product.id).label('count')
    ).group_by(Product.category).all()

    category_stats = {}
    for category, count in products_by_category:
        category_name = str(category) if category else "Uncategorized"
        category_stats[category_name] = count

    # Recent activity (comments in last 7 days)
    from datetime import datetime, timedelta
    seven_days_ago = datetime.now() - timedelta(days=7)
    recent_comments_count = db.query(ProductComment).filter(
        ProductComment.created_at >= seven_days_ago
    ).count()

    # Top rated products
    top_rated = db.query(
        Product.id,
        Product.name,
        func.avg(ProductComment.rating).label('avg_rating'),
        func.count(ProductComment.id).label('review_count')
    ).join(ProductComment).group_by(Product.id, Product.name)\
     .having(func.count(ProductComment.id) >= 1)\
     .order_by(desc('avg_rating')).limit(5).all()

    top_rated_products = []
    for product_id, product_name, avg_rating, review_count in top_rated:
        top_rated_products.append({
            "id": product_id,
            "name": product_name,
            "avg_rating": round(float(avg_rating), 2),
            "review_count": review_count
        })

    # Order statistics
    total_orders = db.query(Order).count()
    pending_orders = db.query(Order).filter(Order.status == OrderStatus.PENDING).count()
    processing_orders = db.query(Order).filter(Order.status == OrderStatus.PROCESSING).count()
    completed_orders = db.query(Order).filter(Order.status == OrderStatus.COMPLETED).count()
    cancelled_orders = db.query(Order).filter(Order.status == OrderStatus.CANCELLED).count()

    # Total revenue from completed orders
    total_revenue_result = db.query(func.sum(Order.total_amount)).filter(
        Order.status == OrderStatus.COMPLETED,
        Order.payment_status == "completed"
    ).scalar()
    total_revenue = float(total_revenue_result) if total_revenue_result else 0.0

    # Recent orders (last 7 days)
    recent_orders_count = db.query(Order).filter(
        Order.created_at >= seven_days_ago
    ).count()

    return {
        "total_users": total_users,
        "total_admins": total_admins,
        "total_products": total_products,
        "total_comments": total_comments,
        "avg_rating": avg_rating,
        "low_stock_products": low_stock_products,
        "products_by_category": category_stats,
        "recent_comments_count": recent_comments_count,
        "top_rated_products": top_rated_products,
        "total_orders": total_orders,
        "pending_orders": pending_orders,
        "processing_orders": processing_orders,
        "completed_orders": completed_orders,
        "cancelled_orders": cancelled_orders,
        "total_revenue": total_revenue,
        "recent_orders_count": recent_orders_count
    }

@router.get("/products/trending", response_model=List[Dict])
async def get_trending_products(
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get trending products based on comments (Admin only)"""

    # Products with most comments in last 30 days
    from datetime import datetime, timedelta
    thirty_days_ago = datetime.now() - timedelta(days=30)

    trending = db.query(
        Product.id,
        Product.name,
        Product.category,
        Product.price,
        func.count(ProductComment.id).label('comment_count'),
        func.avg(ProductComment.rating).label('avg_rating')
    ).join(ProductComment).filter(
        ProductComment.created_at >= thirty_days_ago
    ).group_by(Product.id, Product.name, Product.category, Product.price)\
     .order_by(desc('comment_count')).limit(10).all()

    trending_products = []
    for product_id, name, category, price, comment_count, avg_rating in trending:
        category_name = str(category) if category else "Uncategorized"
        trending_products.append({
            "id": product_id,
            "name": name,
            "category": category_name,
            "price": price,
            "comment_count": comment_count,
            "avg_rating": round(float(avg_rating), 2) if avg_rating else 0.0
        })

    return trending_products
