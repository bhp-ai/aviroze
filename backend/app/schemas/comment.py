from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class CommentBase(BaseModel):
    rating: int  # 1-5
    comment: str

class CommentCreate(CommentBase):
    product_id: int
    order_id: Optional[int] = None  # Link to specific purchase

class CommentUpdate(BaseModel):
    rating: Optional[int] = None
    comment: Optional[str] = None

class CommentResponse(CommentBase):
    id: int
    product_id: int
    user_id: int
    order_id: Optional[int] = None
    username: str  # Include user info in response
    user_email: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    purchase_date: Optional[datetime] = None  # Date when product was ordered

    class Config:
        from_attributes = True

class CommentWithProduct(CommentResponse):
    product_name: str
    product_category: str
