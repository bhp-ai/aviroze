from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any

class UserActivityLogCreate(BaseModel):
    user_id: Optional[int] = None
    activity_type: str
    resource_type: Optional[str] = None
    resource_id: Optional[int] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    description: Optional[str] = None

class UserActivityLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    activity_type: str
    resource_type: Optional[str]
    resource_id: Optional[int]
    ip_address: Optional[str]
    user_agent: Optional[str]
    details: Optional[Dict[str, Any]]
    description: Optional[str]
    created_at: datetime

    # Populated from relationships
    user_email: Optional[str] = None
    user_username: Optional[str] = None

    class Config:
        from_attributes = True

class UserActivityLogStats(BaseModel):
    total_activities: int
    activities_by_type: Dict[str, int]
    unique_users: int
    recent_activity_count: int
