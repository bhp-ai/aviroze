from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    username: str
    email: EmailStr
    role: str
    status: str

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "user"

class UserUpdate(BaseModel):
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    status: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
