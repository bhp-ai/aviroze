from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Dict, Any

class APIRequestLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    method: str
    path: str
    endpoint: Optional[str]
    status_code: Optional[int]
    response_time: Optional[float]
    ip_address: Optional[str]
    user_agent: Optional[str]
    query_params: Optional[Dict[str, Any]]
    created_at: datetime

    # Populated from relationships
    user_email: Optional[str] = None
    user_username: Optional[str] = None

    class Config:
        from_attributes = True

class APIRequestLogStats(BaseModel):
    total_requests: int
    requests_by_method: Dict[str, int]
    requests_by_status: Dict[str, int]
    avg_response_time: float
    recent_requests_count: int
