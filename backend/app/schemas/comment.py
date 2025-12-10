from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CommentBase(BaseModel):
    rating: int  # 1-5
    comment: str

class CommentCreate(CommentBase):
    product_id: int

class CommentUpdate(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None

class CommentResponse(CommentBase):
    id: int
    product_id: int
    user_id: int
    username: str  # Include user info in response
    user_email: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CommentWithProduct(CommentResponse):
    product_name: str
    product_category: str
