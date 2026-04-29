from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field, field_validator


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    password: str = Field(min_length=1, max_length=128)

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
    requires_details: bool = False
    is_pinned: bool = False


class BookUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    year: Optional[str] = Field(default=None, min_length=2, max_length=20)
    is_active: Optional[bool] = None
    requires_details: Optional[bool] = None
    is_pinned: Optional[bool] = None


class BookOptionCreate(BaseModel):
    book_id: int
    mode: Optional[str] = None
    print_type: Optional[str] = None
    price: float = Field(gt=0)
    max_copies: int = Field(default=15, gt=0)

    @field_validator("mode")
    @classmethod
    def validate_mode(cls, value: Optional[str]):
        if value is None:
            return ""
        return value.strip()

    @field_validator("print_type")
    @classmethod
    def validate_print_type(cls, value: Optional[str]):
        if value is None:
            return ""
        normalized = value.strip().lower()
        if not normalized:
            return ""
        if normalized not in {"single", "double", "single_side", "double_side"}:
            raise ValueError("Print type must be single or double")
        return value


class BookOptionUpdate(BaseModel):
    mode: Optional[str] = None
    print_type: Optional[str] = None
    price: Optional[float] = None
    max_copies: Optional[int] = None

    @field_validator("print_type")
    @classmethod
    def validate_optional_print_type_value(cls, value: Optional[str]):
        if value is None:
            return value
        normalized = value.strip().lower()
        if not normalized:
            return ""
        if normalized not in {"single", "double", "single_side", "double_side"}:
            raise ValueError("Print type must be single or double")
        return value


class CartItemCreate(BaseModel):
    item_type: str
    book_id: Optional[int] = None
    upload_id: Optional[int] = None
    stored_filename: Optional[str] = None
    total_pages: Optional[int] = None
    mode: Optional[str] = None
    print_type: Optional[str] = None
    quantity: int = Field(default=1, gt=0)
    leave_date: Optional[str] = None
    leave_to_date: Optional[str] = None
    request_reason: Optional[str] = None

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

    @field_validator("leave_date")
    @classmethod
    def validate_leave_date(cls, value: Optional[str]):
        if value is None:
            return value
        normalized = value.strip()
        return normalized or None

    @field_validator("leave_to_date")
    @classmethod
    def validate_leave_to_date(cls, value: Optional[str]):
        if value is None:
            return value
        normalized = value.strip()
        return normalized or None

    @field_validator("request_reason")
    @classmethod
    def validate_request_reason(cls, value: Optional[str]):
        if value is None:
            return value
        normalized = value.strip()
        if not normalized:
            return None
        if len(normalized) < 3:
            raise ValueError("Reason must be at least 3 characters")
        return normalized


class OrderCreate(BaseModel):
    delivery_type: Literal["hostel", "dayscholar"]
    hostel_name: Optional[str] = None
    contact_number: str = Field(min_length=10, max_length=10)
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
        if not normalized:
            return None
        if not normalized.isdigit() or len(normalized) != 10:
            raise ValueError("Contact number must contain exactly 10 digits")
        return normalized


class PaymentVerification(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class UpiPaymentVerification(BaseModel):
    amount: float = Field(gt=0)
    timestamp: datetime
    raw_text: Optional[str] = None


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


class SupportMessageCreate(BaseModel):
    message: str = Field(min_length=3, max_length=1000)

    @field_validator("message")
    @classmethod
    def validate_message(cls, value: str):
        normalized = value.strip()
        if not normalized:
            raise ValueError("Message is required")
        return normalized


class BannerUpdate(BaseModel):
    title: Optional[str] = Field(default=None, max_length=200)
    subtitle: Optional[str] = Field(default=None, max_length=400)
    link: Optional[str] = Field(default=None, max_length=500)
    clickable: Optional[bool] = None
    active: Optional[bool] = None


class ApiOrderItemCreate(BaseModel):
    book_id: int
    quantity: int = Field(gt=0)
    mode: Optional[str] = None
    print_type: Optional[str] = None


class ApiOrderCreate(BaseModel):
    username: str = Field(min_length=2, max_length=120)
    phone_number: str = Field(min_length=10, max_length=10)
    hostel: str = Field(min_length=2, max_length=120)
    alternate_phone: Optional[str] = Field(default=None, min_length=10, max_length=10)
    items: list[ApiOrderItemCreate]

    @field_validator("phone_number", "alternate_phone")
    @classmethod
    def validate_api_phone(cls, value: Optional[str]):
        if value is None:
            return value
        normalized = value.strip()
        if not normalized.isdigit() or len(normalized) != 10:
            raise ValueError("Phone number must contain exactly 10 digits")
        return normalized

    @field_validator("hostel", "username")
    @classmethod
    def validate_api_text(cls, value: str):
        normalized = value.strip()
        if not normalized:
            raise ValueError("Field is required")
        return normalized


class ApiOrderVerify(BaseModel):
    order_id: int
    utr: str = Field(min_length=4, max_length=120)

    @field_validator("utr")
    @classmethod
    def validate_utr(cls, value: str):
        normalized = value.strip()
        if not normalized:
            raise ValueError("UTR is required")
        return normalized
