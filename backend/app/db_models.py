from sqlalchemy import Column, Integer, String, Float, Text, Boolean, DateTime, ForeignKey, Table, Enum, LargeBinary, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum
import uuid

# Enums
class UserRole(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"

class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"

class DeletionType(str, enum.Enum):
    SELF = "self"  # User deleted their own account (can still login)
    ADMIN = "admin"  # Admin deleted the account (cannot login)

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
    PRODUCT_CREATE = "product_create"
    PRODUCT_UPDATE = "product_update"
    PRODUCT_DELETE = "product_delete"
    CART_ADD = "cart_add"
    CART_REMOVE = "cart_remove"
    CART_VIEW = "cart_view"
    CHECKOUT_START = "checkout_start"
    CHECKOUT_COMPLETE = "checkout_complete"
    ORDER_VIEW = "order_view"
    ORDER_CREATE = "order_create"
    ORDER_UPDATE = "order_update"
    SEARCH = "search"
    FILTER = "filter"
    COMMENT_CREATE = "comment_create"
    COMMENT_UPDATE = "comment_update"
    COMMENT_DELETE = "comment_delete"
    ADMIN_ACTION = "admin_action"
    PAGE_VIEW = "page_view"

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

    id = Column(Integer, primary_key=True, index=True)  # Internal ID for database performance
    public_id = Column(String(36), unique=True, nullable=False, index=True, default=lambda: str(uuid.uuid4()))  # Public UUID
    username = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    status = Column(Enum(UserStatus), default=UserStatus.ACTIVE, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True, default=None, index=True)  # Soft delete timestamp
    deletion_type = Column(Enum(DeletionType), nullable=True, default=None)  # Who deleted: self or admin
    deleted_by = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True)  # Admin who deleted
    stripe_customer_id = Column(String(255), nullable=True, unique=True, index=True)  # Stripe Customer ID for payment integration

    # Relationships
    comments = relationship("ProductComment", back_populates="user", cascade="all, delete-orphan")

# Collection Model
class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    image = Column(LargeBinary, nullable=True)  # Store image as binary
    image_mimetype = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Product Model
class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String(100), nullable=False, index=True)  # Changed from Enum to String for flexibility
    collection = Column(String(100), nullable=True, index=True)  # Collection/Product line
    size_guide = Column(JSON, nullable=True)  # Size guide with measurements (e.g., [{"size": "S", "chest": "24", "waist": "38"}])
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
    variants = relationship("ProductVariant", back_populates="product", cascade="all, delete-orphan")

# Product Image Model
class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    image = Column(LargeBinary, nullable=False)  # Binary image data
    image_mimetype = Column(String(50), nullable=False)  # Store MIME type
    display_order = Column(Integer, default=0, nullable=False)  # Order of images
    color = Column(String(50), nullable=True, index=True)  # Color variant (e.g., 'gray', 'navy', 'charcoal')
    media_type = Column(String(20), default='image', nullable=False)  # 'image', 'video', or 'gif'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    product = relationship("Product", back_populates="images")

# Product Variant Model - For color + size based inventory
class ProductVariant(Base):
    __tablename__ = "product_variants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id', ondelete='CASCADE'), nullable=False, index=True)
    color = Column(String(50), nullable=True)  # Color variant (e.g., 'gray', 'navy')
    size = Column(String(50), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    product = relationship("Product", back_populates="variants")

# Product Comment Model
class ProductComment(Base):
    __tablename__ = "product_comments"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey('products.id', ondelete='CASCADE'), nullable=False)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    order_id = Column(Integer, ForeignKey('orders.id', ondelete='CASCADE'), nullable=True)  # Link to specific order
    rating = Column(Integer, nullable=False)  # 1-5 stars
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    product = relationship("Product", back_populates="comments")
    user = relationship("User", back_populates="comments")
    order = relationship("Order", backref="comments")

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
    activity_type = Column(String(50), nullable=False, index=True)  # Changed from Enum to String to avoid conversion issues

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

# API Request Log Model - For tracking all API requests (separate from user activities)
class APIRequestLog(Base):
    __tablename__ = "api_request_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)

    # Request details
    method = Column(String(10), nullable=False, index=True)  # GET, POST, PUT, DELETE, etc.
    path = Column(String(500), nullable=False, index=True)  # /api/products, /api/orders, etc.
    endpoint = Column(String(500), nullable=True)  # Specific endpoint name

    # Response details
    status_code = Column(Integer, nullable=True, index=True)  # 200, 404, 500, etc.
    response_time = Column(Float, nullable=True)  # Response time in seconds

    # Request metadata
    ip_address = Column(String(45), nullable=True, index=True)
    user_agent = Column(String(500), nullable=True)
    query_params = Column(JSON, nullable=True)  # Query parameters

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User")

# Banner Status Enum
class BannerStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SCHEDULED = "scheduled"

# Banner Type Enum
class BannerType(str, enum.Enum):
    HERO = "hero"
    PROMOTIONAL = "promotional"
    ANNOUNCEMENT = "announcement"
    CATEGORY = "category"

# Banner Model - For homepage promotional banners
class Banner(Base):
    __tablename__ = "banners"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    subtitle = Column(Text, nullable=True)
    description = Column(Text, nullable=True)

    # Banner type and status
    banner_type = Column(Enum(BannerType), default=BannerType.PROMOTIONAL, nullable=False, index=True)
    status = Column(Enum(BannerStatus), default=BannerStatus.INACTIVE, nullable=False, index=True)

    # Display settings
    display_order = Column(Integer, default=0, nullable=False, index=True)  # Order of display

    # Media
    image = Column(LargeBinary, nullable=True)  # Banner image
    image_mimetype = Column(String(50), nullable=True)
    mobile_image = Column(LargeBinary, nullable=True)  # Separate mobile image
    mobile_image_mimetype = Column(String(50), nullable=True)

    # Link and CTA
    link_url = Column(String(500), nullable=True)  # Link when banner is clicked
    link_text = Column(String(100), nullable=True)  # CTA button text
    link_target = Column(String(20), default="_self", nullable=False)  # _self or _blank

    # Scheduling
    start_date = Column(DateTime(timezone=True), nullable=True, index=True)
    end_date = Column(DateTime(timezone=True), nullable=True, index=True)

    # Style customization
    text_color = Column(String(7), nullable=True)  # Hex color for text
    background_color = Column(String(7), nullable=True)  # Hex color for background
    button_color = Column(String(7), nullable=True)  # Hex color for CTA button

    # Analytics
    view_count = Column(Integer, default=0, nullable=False)  # Track impressions
    click_count = Column(Integer, default=0, nullable=False)  # Track clicks

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Address Model - For user shipping addresses
class Address(Base):
    __tablename__ = "addresses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=False)
    address_line1 = Column(String(500), nullable=False)
    address_line2 = Column(String(500), nullable=True)
    city = Column(String(100), nullable=False)
    state = Column(String(100), nullable=False)
    postal_code = Column(String(20), nullable=False)
    country = Column(String(100), nullable=False, default="Indonesia")
    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User")

# Wishlist Model - For user saved products
class Wishlist(Base):
    __tablename__ = "wishlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey('products.id', ondelete='CASCADE'), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User")
    product = relationship("Product")
