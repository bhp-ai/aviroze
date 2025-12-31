from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Union

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

class ProductImageBase(BaseModel):
    url: str
    color: Optional[str] = None
    display_order: int
    media_type: str = 'image'  # 'image', 'video', or 'gif'

class ProductVariantBase(BaseModel):
    color: Optional[str] = None
    size: str
    quantity: int

class ProductBase(BaseModel):
    name: str
    description: str
    price: float
    category: str
    stock: int
    images: List[ProductImageBase] = []  # Array of image objects with color info
    colors: Optional[List[str]] = []
    sizes: Optional[List[str]] = []
    variants: Optional[List[ProductVariantBase]] = []  # Color + Size based inventory

class ProductCreate(ProductBase):
    discount: Optional[DiscountBase] = None
    voucher: Optional[VoucherBase] = None

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    stock: Optional[int] = None
    images: Optional[List[ProductImageBase]] = None
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
