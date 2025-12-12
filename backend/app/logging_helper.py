from sqlalchemy.orm import Session
from app.db_models import OrderLog, UserActivityLog, LogAction, UserActivityType
from typing import Optional, Dict, Any
from fastapi import Request

def log_order_event(
    db: Session,
    order_id: int,
    action: LogAction,
    user_id: Optional[int] = None,
    order_status: Optional[str] = None,
    payment_status: Optional[str] = None,
    payment_method: Optional[str] = None,
    total_amount: Optional[float] = None,
    description: Optional[str] = None,
    previous_value: Optional[Dict[str, Any]] = None,
    new_value: Optional[Dict[str, Any]] = None,
):
    """Helper function to log order/transaction events"""
    try:
        log = OrderLog(
            order_id=order_id,
            user_id=user_id,
            action=action,
            order_status=order_status,
            payment_status=payment_status,
            payment_method=payment_method,
            total_amount=total_amount,
            description=description,
            previous_value=previous_value,
            new_value=new_value,
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Failed to log order event: {e}")
        db.rollback()

def log_user_activity(
    db: Session,
    activity_type: UserActivityType,
    user_id: Optional[int] = None,
    resource_type: Optional[str] = None,
    resource_id: Optional[int] = None,
    description: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    request: Optional[Request] = None,
):
    """Helper function to log user activities"""
    try:
        ip_address = None
        user_agent = None

        # Initialize details if not provided
        if details is None:
            details = {}

        if request:
            # Get IP address
            ip_address = request.client.host if request.client else None
            # Get user agent
            user_agent = request.headers.get("user-agent", None)

            # Add URL information to details
            details["url"] = str(request.url)
            details["path"] = request.url.path
            details["method"] = request.method

            # Add query parameters if any
            if request.url.query:
                details["query_params"] = request.url.query

        log = UserActivityLog(
            user_id=user_id,
            activity_type=activity_type,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print(f"Failed to log user activity: {e}")
        db.rollback()
