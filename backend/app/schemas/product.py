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
    image: Optional[str] = None
    colors: Optional[List[str]] = []

class ProductCreate(ProductBase):
    discount: Optional[DiscountBase] = None
    voucher: Optional[VoucherBase] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    stock: Optional[int] = None
    image: Optional[str] = None
    colors: Optional[List[str]] = None
    discount: Optional[DiscountBase] = None
    voucher: Optional[VoucherBase] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    discount: Optional[DiscountBase] = None
    voucher: Optional[VoucherBase] = None

    class Config:
        from_attributes = True
