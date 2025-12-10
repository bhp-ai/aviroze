from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class OrderStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class OrderItem(BaseModel):
    product_id: str
    product_name: str
    quantity: int
    size: Optional[str] = None
    color: Optional[str] = None
    price: float
    subtotal: float

class ShippingAddress(BaseModel):
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    state: str
    postal_code: str
    country: str = "Indonesia"

class Order(BaseModel):
    id: Optional[str] = None
    user_id: str
    items: List[OrderItem]
    shipping_address: ShippingAddress
    subtotal: float
    shipping_cost: float
    total: float
    status: OrderStatus = OrderStatus.PENDING
    payment_method: str
    payment_status: str = "pending"
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
