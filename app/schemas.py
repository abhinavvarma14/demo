from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=4, max_length=128)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: str):
        normalized = value.strip().lower()
        if not normalized:
            raise ValueError("Username is required")
        if not normalized.replace("_", "").isalnum():
            raise ValueError("Username must contain only letters, numbers, or underscores")
        return normalized

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str):
        if len(value.strip()) < 4:
            raise ValueError("Password must be at least 4 characters")
        return value


class UserLogin(BaseModel):
    username: str
    password: str


class BookCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    year: str = Field(min_length=2, max_length=20)


class BookUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    year: Optional[str] = Field(default=None, min_length=2, max_length=20)
    is_active: Optional[bool] = None


class BookOptionCreate(BaseModel):
    book_id: int
    mode: str
    print_type: str
    price: float = Field(gt=0)
    max_copies: int = Field(default=15, gt=0)

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, value: str):
        normalized = value.strip()
        if not normalized:
            raise ValueError("Mode is required")
        return normalized

    @field_validator("print_type")
    @classmethod
    def validate_print_type(cls, value: str):
        normalized = value.strip().lower()
        if normalized not in {"single", "double", "single_side", "double_side"}:
            raise ValueError("Print type must be single or double")
        return value


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
    quantity: int = Field(default=1, gt=0)

    @field_validator("item_type")
    @classmethod
    def validate_item_type(cls, value: str):
        normalized = value.strip().lower()
        if normalized not in {"book", "pdf"}:
            raise ValueError("Item type must be book or pdf")
        return normalized

    @field_validator("mode")
    @classmethod
    def validate_optional_mode(cls, value: Optional[str]):
        if value is None:
            return value
        normalized = value.strip()
        if not normalized:
            raise ValueError("Mode is required")
        return normalized

    @field_validator("print_type")
    @classmethod
    def validate_optional_print_type(cls, value: Optional[str]):
        if value is None:
            return value
        normalized = value.strip().lower()
        if normalized not in {"single", "double", "single_side", "double_side"}:
            raise ValueError("Print type must be single or double")
        return value


class OrderCreate(BaseModel):
    delivery_type: Literal["hostel", "dayscholar"]
    hostel_name: Optional[str] = None
    contact_number: str = Field(min_length=10, max_length=15)
    alternate_contact_number: Optional[str] = None

    @field_validator("hostel_name")
    @classmethod
    def validate_hostel_name(cls, value: Optional[str]):
        if value is None:
            return value
        normalized = value.strip()
        return normalized or None

    @field_validator("contact_number", "alternate_contact_number")
    @classmethod
    def validate_contact_number(cls, value: Optional[str]):
        if value is None:
            return value
        normalized = value.strip()
        if not normalized.isdigit() or len(normalized) not in {10, 11, 12, 13, 14, 15}:
            raise ValueError("Contact number must contain 10 to 15 digits")
        return normalized


class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class CartItemUpdate(BaseModel):
    quantity: int = Field(gt=0)


class PrintQueueAction(BaseModel):
    item_name: str = Field(min_length=1, max_length=255)
    mode: Optional[str] = None
    print_type: str

    @field_validator("item_name")
    @classmethod
    def validate_item_name(cls, value: str):
        normalized = value.strip()
        if not normalized:
            raise ValueError("Item name is required")
        return normalized

    @field_validator("print_type")
    @classmethod
    def validate_queue_print_type(cls, value: str):
        normalized = value.strip().lower()
        if normalized not in {"single", "double", "single_side", "double_side"}:
            raise ValueError("Print type must be single or double")
        return value
