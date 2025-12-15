from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Table, Enum, LargeBinary, JSON
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

class LogAction(str, enum.Enum):
    CREATED = "created"
    UPDATED = "updated"
    STATUS_CHANGED = "status_changed"
    PAYMENT_UPDATED = "payment_updated"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"
    SHIPPED = "shipped"
    DELIVERED = "delivered"

class UserActivityType(str, enum.Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    REGISTER = "register"
    PASSWORD_CHANGE = "password_change"
    PROFILE_UPDATE = "profile_update"
    PRODUCT_VIEW = "product_view"
    CART_ADD = "cart_add"
    CART_REMOVE = "cart_remove"
    CHECKOUT_START = "checkout_start"
    CHECKOUT_COMPLETE = "checkout_complete"
    SEARCH = "search"
    FILTER = "filter"
    COMMENT_CREATE = "comment_create"
    COMMENT_UPDATE = "comment_update"
    COMMENT_DELETE = "comment_delete"

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
    image = Column(LargeBinary, nullable=True)  # Kept for backward compatibility (primary image)
    image_mimetype = Column(String(50), nullable=True)  # Store MIME type (e.g., image/jpeg, image/png)
    colors = Column(JSON, nullable=True, default=list)  # Array of color names
    sizes = Column(JSON, nullable=True, default=list)  # Array of size options
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
    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan", order_by="ProductImage.display_order")

# Product Image Model
class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    image = Column(LargeBinary, nullable=False)  # Binary image data
    image_mimetype = Column(String(50), nullable=False)  # Store MIME type
    display_order = Column(Integer, default=0, nullable=False)  # Order of images
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    product = relationship("Product", back_populates="images")

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
    payment_method = Column(String(200), nullable=True)  # Increased to 200 to store Stripe session IDs
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

# Order Log Model - For tracking all order/transaction changes
class OrderLog(Base):
    __tablename__ = "order_logs"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey('orders.id', ondelete='CASCADE'), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    action = Column(Enum(LogAction), nullable=False, index=True)

    # Order snapshot at time of log
    order_status = Column(String(50), nullable=True, index=True)
    payment_status = Column(String(50), nullable=True, index=True)
    payment_method = Column(String(200), nullable=True)
    total_amount = Column(Float, nullable=True)

    # Change details
    previous_value = Column(JSON, nullable=True)
    new_value = Column(JSON, nullable=True)

    # Additional context
    description = Column(Text, nullable=True)
    meta_data = Column(JSON, nullable=True)  # Renamed from 'metadata' (reserved name)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    order = relationship("Order")
    user = relationship("User")

# User Activity Log Model - For tracking user activities
class UserActivityLog(Base):
    __tablename__ = "user_activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)  # Null for anonymous activities
    activity_type = Column(Enum(UserActivityType), nullable=False, index=True)

    # Activity details
    resource_type = Column(String(50), nullable=True, index=True)  # e.g., 'product', 'order', 'comment'
    resource_id = Column(Integer, nullable=True)  # ID of the resource

    # Request information (for performance and security)
    ip_address = Column(String(45), nullable=True, index=True)  # IPv6 compatible
    user_agent = Column(String(500), nullable=True)

    # Additional data
    details = Column(JSON, nullable=True)  # Flexible data storage
    description = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User")
