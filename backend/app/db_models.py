from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Table, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum

# Enums
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"

class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

# Removed ProductCategory enum to allow flexible categories
# class ProductCategory(str, enum.Enum):
#     OUTERWEAR = "Outerwear"
#     TOPS = "Tops"
#     BOTTOMS = "Bottoms"
#     DRESSES = "Dresses"
#     ACCESSORIES = "Accessories"
#     SHOES = "Shoes"

# Association table for product colors
product_colors = Table(
    'product_colors',
    Base.metadata,
    Column('product_id', Integer, ForeignKey('products.id', ondelete='CASCADE')),
    Column('color', String(7))  # Hex color codes
)

# User Model
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    comments = relationship("ProductComment", back_populates="user", cascade="all, delete-orphan")

# Product Model
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String(100), nullable=False, index=True)  # Changed from Enum to String for flexibility
    stock = Column(Integer, default=0, nullable=False)
    image = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Discount fields
    discount_enabled = Column(Boolean, default=False)
    discount_type = Column(String(20), nullable=True)  # 'percentage' or 'fixed'
    discount_value = Column(Float, nullable=True)

    # Voucher fields
    voucher_enabled = Column(Boolean, default=False)
    voucher_code = Column(String(50), nullable=True, unique=True)
    voucher_discount_type = Column(String(20), nullable=True)
    voucher_discount_value = Column(Float, nullable=True)
    voucher_expiry_date = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    comments = relationship("ProductComment", back_populates="product", cascade="all, delete-orphan")

# Product Comment Model
class ProductComment(Base):
    __tablename__ = "product_comments"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5 stars
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    product = relationship("Product", back_populates="comments")
    user = relationship("User", back_populates="comments")

# Order Status Enum
class OrderStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

# Order Model
class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING, nullable=False, index=True)
    total_amount = Column(Float, nullable=False)
    payment_method = Column(String(50), nullable=True)
    payment_status = Column(String(50), default="pending", nullable=False)  # pending, completed, failed
    shipping_address = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

# Order Item Model
class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey('orders.id', ondelete='CASCADE'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)  # Price at time of purchase
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product")
