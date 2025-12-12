from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any

class OrderLogBase(BaseModel):
    order_id: int
    action: str
    order_status: Optional[str] = None
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None
    total_amount: Optional[float] = None
    description: Optional[str] = None

class OrderLogCreate(BaseModel):
    order_id: int
    user_id: Optional[int] = None
    action: str
    order_status: Optional[str] = None
    payment_status: Optional[str] = None
    payment_method: Optional[str] = None
    total_amount: Optional[float] = None
    previous_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    meta_data: Optional[Dict[str, Any]] = None

class OrderLogUpdate(BaseModel):
    description: Optional[str] = None
    meta_data: Optional[Dict[str, Any]] = None

class OrderLogResponse(BaseModel):
    id: int
    order_id: int
    user_id: Optional[int]
    action: str
    order_status: Optional[str]
    payment_status: Optional[str]
    payment_method: Optional[str]
    total_amount: Optional[float]
    previous_value: Optional[Dict[str, Any]]
    new_value: Optional[Dict[str, Any]]
    description: Optional[str]
    meta_data: Optional[Dict[str, Any]]
    created_at: datetime

    # Populated from relationships
    user_email: Optional[str] = None
    user_username: Optional[str] = None

    class Config:
        from_attributes = True

class OrderLogStats(BaseModel):
    total_logs: int
    logs_by_action: Dict[str, int]
    recent_activity_count: int
    total_orders_tracked: int
