from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class User(BaseModel):
    id: Optional[str] = None
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    hashed_password: str
    is_active: bool = True
    is_admin: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    is_active: bool
    created_at: datetime
