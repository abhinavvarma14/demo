from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    # Legacy compatibility: some deployed databases still have this column.
    # We keep it in sync with password_hash using hashed values only.
    password = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="user")

    uploads = relationship("Upload", back_populates="user", cascade="all, delete")
    cart_items = relationship("CartItem", back_populates="user", cascade="all, delete")
    orders = relationship("Order", back_populates="user", cascade="all, delete")
    support_threads = relationship("SupportThread", back_populates="user", cascade="all, delete")


class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    year = Column(String)
    is_active = Column(Boolean, default=True)
    requires_details = Column(Boolean, default=False)
    is_pinned = Column(Boolean, default=False)

    options = relationship("BookOption", back_populates="book", cascade="all, delete")
    cart_items = relationship("CartItem", back_populates="book")
    order_items = relationship("OrderItem", back_populates="book")


class BookOption(Base):
    __tablename__ = "book_options"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=False, index=True)
    mode = Column(String, nullable=False)
    print_type = Column(String, nullable=False)
    price = Column(Float, nullable=False)
    max_copies = Column(Integer, default=15)

    book = relationship("Book", back_populates="options")


class PrintPricing(Base):
    __tablename__ = "print_pricing"

    id = Column(Integer, primary_key=True, index=True)
    mode = Column(String, nullable=False)
    print_type = Column(String, nullable=False)
    price_per_page = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)


class Upload(Base):
    __tablename__ = "uploads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    file_path = Column(String, nullable=True)
    stored_filename = Column(String, nullable=True)
    original_filename = Column(String, nullable=True)
    total_pages = Column(Integer, default=0)
    mode = Column(String, nullable=True)
    print_type = Column(String, nullable=True)
    copies = Column(Integer, default=1)
    calculated_price = Column(Float, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="uploads")
    cart_items = relationship("CartItem", back_populates="upload")
    order_items = relationship("OrderItem", back_populates="upload")


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    item_type = Column(String, nullable=False)
    reference_id = Column(Integer, nullable=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=True)
    mode = Column(String, nullable=True)
    print_type = Column(String, nullable=True)
    item_name = Column(String, nullable=True)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0)
    calculated_price = Column(Float, default=0)
    total_price = Column(Float, default=0)
    leave_date = Column(String, nullable=True)
    request_reason = Column(String, nullable=True)

    user = relationship("User", back_populates="cart_items")
    upload = relationship("Upload", back_populates="cart_items")
    book = relationship("Book", back_populates="cart_items")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    delivery_type = Column(String, nullable=False)
    hostel_name = Column(String, nullable=True)
    contact_number = Column(String, nullable=False)
    alternate_contact_number = Column(String, nullable=True)
    total_amount = Column(Float, default=0)
    razorpay_order_id = Column(String, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    item_type = Column(String, nullable=False)
    reference_id = Column(Integer, nullable=True)
    book_id = Column(Integer, ForeignKey("books.id"), nullable=True, index=True)
    upload_id = Column(Integer, ForeignKey("uploads.id"), nullable=True)
    item_name = Column(String, nullable=True)
    stored_filename = Column(String, nullable=True)
    original_filename = Column(String, nullable=True)
    total_pages = Column(Integer, nullable=True)
    mode = Column(String, nullable=True)
    print_type = Column(String, nullable=True)
    quantity = Column(Integer, default=1)
    unit_price = Column(Float, default=0)
    calculated_price = Column(Float, default=0)
    total_price = Column(Float, default=0)
    printed = Column(Boolean, default=False, index=True)
    leave_date = Column(String, nullable=True)
    request_reason = Column(String, nullable=True)

    order = relationship("Order", back_populates="items")
    upload = relationship("Upload", back_populates="order_items")
    book = relationship("Book", back_populates="order_items")


class SupportThread(Base):
    __tablename__ = "support_threads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(String, default="open")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="support_threads")
    messages = relationship("SupportMessage", back_populates="thread", cascade="all, delete")


class SupportMessage(Base):
    __tablename__ = "support_messages"

    id = Column(Integer, primary_key=True, index=True)
    thread_id = Column(Integer, ForeignKey("support_threads.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sender_role = Column(String, nullable=False)
    message = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    thread = relationship("SupportThread", back_populates="messages")


class AppSetting(Base):
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True, nullable=False)
    value = Column(String, nullable=True)
