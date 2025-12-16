from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import datetime, timedelta
from app.database import get_db
from app.db_models import OrderLog, UserActivityLog, APIRequestLog, User, Order
from app.schemas.order_log import OrderLogCreate, OrderLogResponse, OrderLogStats
from app.schemas.user_activity_log import UserActivityLogCreate, UserActivityLogResponse, UserActivityLogStats
from app.schemas.api_request_log import APIRequestLogResponse, APIRequestLogStats
from app.auth import get_current_admin_user

router = APIRouter(prefix="/api/logs", tags=["Logs"])

# ==================== ORDER/TRANSACTION LOGS ====================

@router.get("/orders", response_model=List[OrderLogResponse])
async def get_order_logs(
    order_id: Optional[int] = Query(None),
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    payment_status: Optional[str] = Query(None),
    order_status: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get order logs with optimized pagination (max 100)"""
    query = db.query(
        OrderLog.id, OrderLog.order_id, OrderLog.user_id, OrderLog.action,
        OrderLog.order_status, OrderLog.payment_status, OrderLog.payment_method,
        OrderLog.total_amount, OrderLog.previous_value, OrderLog.new_value,
        OrderLog.description, OrderLog.meta_data, OrderLog.created_at,
        User.email.label('user_email'), User.username.label('user_username')
    ).outerjoin(User, OrderLog.user_id == User.id)

    if order_id:
        query = query.filter(OrderLog.order_id == order_id)
    if user_id:
        query = query.filter(OrderLog.user_id == user_id)
    if action:
        query = query.filter(OrderLog.action == action)
    if payment_status:
        query = query.filter(OrderLog.payment_status == payment_status)
    if order_status:
        query = query.filter(OrderLog.order_status == order_status)
    if start_date:
        query = query.filter(OrderLog.created_at >= start_date)
    if end_date:
        query = query.filter(OrderLog.created_at <= end_date)

    results = query.order_by(desc(OrderLog.created_at)).offset(skip).limit(limit).all()

    return [OrderLogResponse(
        id=r.id, order_id=r.order_id, user_id=r.user_id, action=r.action,
        order_status=r.order_status, payment_status=r.payment_status,
        payment_method=r.payment_method, total_amount=r.total_amount,
        previous_value=r.previous_value, new_value=r.new_value,
        description=r.description, meta_data=r.meta_data, created_at=r.created_at,
        user_email=r.user_email, user_username=r.user_username
    ) for r in results]

@router.post("/orders", response_model=OrderLogResponse, status_code=status.HTTP_201_CREATED)
async def create_order_log(
    log_data: OrderLogCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create order log"""
    order = db.query(Order).filter(Order.id == log_data.order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    new_log = OrderLog(**{k: v for k, v in log_data.dict().items() if v is not None})
    if not new_log.user_id:
        new_log.user_id = current_user.id

    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    result = db.query(
        OrderLog.id, OrderLog.order_id, OrderLog.user_id, OrderLog.action,
        OrderLog.order_status, OrderLog.payment_status, OrderLog.payment_method,
        OrderLog.total_amount, OrderLog.previous_value, OrderLog.new_value,
        OrderLog.description, OrderLog.meta_data, OrderLog.created_at,
        User.email.label('user_email'), User.username.label('user_username')
    ).outerjoin(User, OrderLog.user_id == User.id).filter(OrderLog.id == new_log.id).first()

    return OrderLogResponse(
        id=result.id, order_id=result.order_id, user_id=result.user_id, action=result.action,
        order_status=result.order_status, payment_status=result.payment_status,
        payment_method=result.payment_method, total_amount=result.total_amount,
        previous_value=result.previous_value, new_value=result.new_value,
        description=result.description, meta_data=result.meta_data, created_at=result.created_at,
        user_email=result.user_email, user_username=result.user_username
    )

@router.delete("/orders/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order_log(
    log_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete order log (system admin only)"""
    if current_user.email != "admin@admin.com":
        raise HTTPException(status_code=403, detail="System admin only")

    log = db.query(OrderLog).filter(OrderLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    db.delete(log)
    db.commit()

@router.get("/orders/stats", response_model=OrderLogStats)
async def get_order_stats(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get order log statistics"""
    start_date = datetime.utcnow() - timedelta(days=days)
    total_logs = db.query(func.count(OrderLog.id)).scalar() or 0
    action_counts = db.query(OrderLog.action, func.count(OrderLog.id)).group_by(OrderLog.action).all()
    logs_by_action = {str(a): c for a, c in action_counts}
    recent_activity = db.query(func.count(OrderLog.id)).filter(OrderLog.created_at >= start_date).scalar() or 0
    total_orders = db.query(func.count(func.distinct(OrderLog.order_id))).scalar() or 0

    return OrderLogStats(
        total_logs=total_logs, logs_by_action=logs_by_action,
        recent_activity_count=recent_activity, total_orders_tracked=total_orders
    )

# ==================== USER ACTIVITY LOGS ====================

@router.get("/activities", response_model=List[UserActivityLogResponse])
async def get_activity_logs(
    user_id: Optional[int] = Query(None),
    activity_type: Optional[str] = Query(None),
    resource_type: Optional[str] = Query(None),
    ip_address: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get user activity logs with optimized pagination (max 100)"""
    query = db.query(
        UserActivityLog.id, UserActivityLog.user_id, UserActivityLog.activity_type,
        UserActivityLog.resource_type, UserActivityLog.resource_id,
        UserActivityLog.ip_address, UserActivityLog.user_agent,
        UserActivityLog.details, UserActivityLog.description, UserActivityLog.created_at,
        User.email.label('user_email'), User.username.label('user_username')
    ).outerjoin(User, UserActivityLog.user_id == User.id)

    if user_id:
        query = query.filter(UserActivityLog.user_id == user_id)
    if activity_type:
        query = query.filter(UserActivityLog.activity_type == activity_type)
    if resource_type:
        query = query.filter(UserActivityLog.resource_type == resource_type)
    if ip_address:
        query = query.filter(UserActivityLog.ip_address.like(f"%{ip_address}%"))
    if search:
        # Search across username, activity type, description, and IP
        search_filter = f"%{search}%"
        query = query.filter(
            (User.username.like(search_filter)) |
            (UserActivityLog.activity_type.like(search_filter)) |
            (UserActivityLog.description.like(search_filter)) |
            (UserActivityLog.ip_address.like(search_filter))
        )
    if start_date:
        query = query.filter(UserActivityLog.created_at >= start_date)
    if end_date:
        query = query.filter(UserActivityLog.created_at <= end_date)

    results = query.order_by(desc(UserActivityLog.created_at)).offset(skip).limit(limit).all()

    return [UserActivityLogResponse(
        id=r.id, user_id=r.user_id, activity_type=r.activity_type,
        resource_type=r.resource_type, resource_id=r.resource_id,
        ip_address=r.ip_address, user_agent=r.user_agent,
        details=r.details, description=r.description, created_at=r.created_at,
        user_email=r.user_email, user_username=r.user_username
    ) for r in results]

@router.post("/activities", response_model=UserActivityLogResponse, status_code=status.HTTP_201_CREATED)
async def create_activity_log(
    log_data: UserActivityLogCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Create user activity log (public endpoint for client-side tracking)"""
    from app.db_models import UserActivityType

    # Get IP address from request
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)

    # Validate activity_type
    valid_values = [member.value for member in UserActivityType]
    if log_data.activity_type not in valid_values:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid activity type: {log_data.activity_type}. Valid values: {valid_values}"
        )

    new_log = UserActivityLog(**{k: v for k, v in log_data.dict().items() if v is not None})

    # Override IP and user agent from request if not provided
    if not new_log.ip_address:
        new_log.ip_address = ip_address
    if not new_log.user_agent:
        new_log.user_agent = user_agent

    db.add(new_log)
    db.commit()
    db.refresh(new_log)

    result = db.query(
        UserActivityLog.id, UserActivityLog.user_id, UserActivityLog.activity_type,
        UserActivityLog.resource_type, UserActivityLog.resource_id,
        UserActivityLog.ip_address, UserActivityLog.user_agent,
        UserActivityLog.details, UserActivityLog.description, UserActivityLog.created_at,
        User.email.label('user_email'), User.username.label('user_username')
    ).outerjoin(User, UserActivityLog.user_id == User.id).filter(UserActivityLog.id == new_log.id).first()

    return UserActivityLogResponse(
        id=result.id, user_id=result.user_id, activity_type=result.activity_type,
        resource_type=result.resource_type, resource_id=result.resource_id,
        ip_address=result.ip_address, user_agent=result.user_agent,
        details=result.details, description=result.description, created_at=result.created_at,
        user_email=result.user_email, user_username=result.user_username
    )

@router.delete("/activities/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity_log(
    log_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete activity log (system admin only)"""
    if current_user.email != "admin@admin.com":
        raise HTTPException(status_code=403, detail="System admin only")

    log = db.query(UserActivityLog).filter(UserActivityLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    db.delete(log)
    db.commit()

@router.get("/activities/stats", response_model=UserActivityLogStats)
async def get_activity_stats(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get user activity statistics"""
    start_date = datetime.utcnow() - timedelta(days=days)
    total_activities = db.query(func.count(UserActivityLog.id)).scalar() or 0
    activity_counts = db.query(UserActivityLog.activity_type, func.count(UserActivityLog.id)).group_by(UserActivityLog.activity_type).all()
    activities_by_type = {str(a): c for a, c in activity_counts}
    unique_users = db.query(func.count(func.distinct(UserActivityLog.user_id))).filter(UserActivityLog.user_id.isnot(None)).scalar() or 0
    recent_activity = db.query(func.count(UserActivityLog.id)).filter(UserActivityLog.created_at >= start_date).scalar() or 0

    return UserActivityLogStats(
        total_activities=total_activities, activities_by_type=activities_by_type,
        unique_users=unique_users, recent_activity_count=recent_activity
    )

# ==================== API REQUEST LOGS ====================

@router.get("/api-requests", response_model=List[APIRequestLogResponse])
async def get_api_request_logs(
    user_id: Optional[int] = Query(None),
    method: Optional[str] = Query(None),
    path: Optional[str] = Query(None),
    status_code: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get API request logs with optimized pagination (max 100)"""
    query = db.query(
        APIRequestLog.id, APIRequestLog.user_id, APIRequestLog.method,
        APIRequestLog.path, APIRequestLog.endpoint, APIRequestLog.status_code,
        APIRequestLog.response_time, APIRequestLog.ip_address,
        APIRequestLog.user_agent, APIRequestLog.query_params, APIRequestLog.created_at,
        User.email.label('user_email'), User.username.label('user_username')
    ).outerjoin(User, APIRequestLog.user_id == User.id)

    if user_id:
        query = query.filter(APIRequestLog.user_id == user_id)
    if method:
        query = query.filter(APIRequestLog.method == method)
    if path:
        query = query.filter(APIRequestLog.path.like(f"%{path}%"))
    if status_code:
        query = query.filter(APIRequestLog.status_code == status_code)
    if start_date:
        query = query.filter(APIRequestLog.created_at >= start_date)
    if end_date:
        query = query.filter(APIRequestLog.created_at <= end_date)

    results = query.order_by(desc(APIRequestLog.created_at)).offset(skip).limit(limit).all()

    return [APIRequestLogResponse(
        id=r.id, user_id=r.user_id, method=r.method,
        path=r.path, endpoint=r.endpoint, status_code=r.status_code,
        response_time=r.response_time, ip_address=r.ip_address,
        user_agent=r.user_agent, query_params=r.query_params,
        created_at=r.created_at, user_email=r.user_email, user_username=r.user_username
    ) for r in results]

@router.delete("/api-requests/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_request_log(
    log_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete API request log (system admin only)"""
    if current_user.email != "admin@admin.com":
        raise HTTPException(status_code=403, detail="System admin only")

    log = db.query(APIRequestLog).filter(APIRequestLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    db.delete(log)
    db.commit()

@router.get("/api-requests/stats", response_model=APIRequestLogStats)
async def get_api_request_stats(
    days: int = Query(30, ge=1, le=365),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Get API request statistics"""
    start_date = datetime.utcnow() - timedelta(days=days)
    total_requests = db.query(func.count(APIRequestLog.id)).scalar() or 0

    method_counts = db.query(APIRequestLog.method, func.count(APIRequestLog.id)).group_by(APIRequestLog.method).all()
    requests_by_method = {str(m): c for m, c in method_counts}

    status_counts = db.query(APIRequestLog.status_code, func.count(APIRequestLog.id)).group_by(APIRequestLog.status_code).all()
    requests_by_status = {str(s): c for s, c in status_counts}

    avg_response_time = db.query(func.avg(APIRequestLog.response_time)).scalar() or 0.0
    recent_requests = db.query(func.count(APIRequestLog.id)).filter(APIRequestLog.created_at >= start_date).scalar() or 0

    return APIRequestLogStats(
        total_requests=total_requests,
        requests_by_method=requests_by_method,
        requests_by_status=requests_by_status,
        avg_response_time=float(avg_response_time),
        recent_requests_count=recent_requests
    )
