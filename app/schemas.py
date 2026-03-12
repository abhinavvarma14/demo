from typing import Optional

from pydantic import BaseModel


class UserCreate(BaseModel):
    username: str
    password: str


class UserLogin(BaseModel):
    username: str
    password: str


class BookCreate(BaseModel):
    name: str
    year: str


class BookOptionCreate(BaseModel):
    book_id: int
    mode: str
    print_type: str
    price: float
    max_copies: int = 15


class BookOptionUpdate(BaseModel):
    mode: Optional[str] = None
    print_type: Optional[str] = None
    price: Optional[float] = None
    max_copies: Optional[int] = None


class CartItemCreate(BaseModel):
    item_type: str
    book_id: Optional[int] = None
    upload_id: Optional[int] = None
    stored_filename: Optional[str] = None
    total_pages: Optional[int] = None
    mode: Optional[str] = None
    print_type: Optional[str] = None
    quantity: int = 1


class OrderCreate(BaseModel):
    delivery_type: str
    hostel_name: Optional[str] = None
    contact_number: str
    alternate_contact_number: Optional[str] = None


class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
