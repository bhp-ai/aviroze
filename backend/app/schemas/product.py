from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class DiscountBase(BaseModel):
    enabled: bool
    type: Optional[str] = None  # 'percentage' or 'fixed'
    value: Optional[float] = None

class VoucherBase(BaseModel):
    enabled: bool
    code: Optional[str] = None
    discount_type: Optional[str] = None
    discount_value: Optional[float] = None
    expiry_date: Optional[datetime] = None

class ProductBase(BaseModel):
    name: str
    description: str
    price: float
    category: str
    stock: int
    images: List[str] = []  # Array of base64 image data URLs
    colors: Optional[List[str]] = []
    sizes: Optional[List[str]] = []

class ProductCreate(ProductBase):
    discount: Optional[DiscountBase] = None
    voucher: Optional[VoucherBase] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    stock: Optional[int] = None
    images: Optional[List[str]] = None
    colors: Optional[List[str]] = None
    sizes: Optional[List[str]] = None
    discount: Optional[DiscountBase] = None
    voucher: Optional[VoucherBase] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    discount: Optional[DiscountBase] = None
    voucher: Optional[VoucherBase] = None

    class Config:
        from_attributes = True
