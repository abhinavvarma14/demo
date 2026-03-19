import os
import shutil
import uuid
import logging
import base64
import time
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
from pathlib import Path

import razorpay
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func, inspect, or_, text
from sqlalchemy.orm import Session, joinedload

load_dotenv()

from . import models, schemas
from .database import SessionLocal, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("batprint")
LOGIN_WINDOW_SECONDS = int(os.getenv("LOGIN_WINDOW_SECONDS", "300"))
LOGIN_MAX_ATTEMPTS = int(os.getenv("LOGIN_MAX_ATTEMPTS", "5"))
login_attempts: dict[str, list[float]] = {}
PDF_SINGLE_PRICE_PER_PAGE = 1.25
PDF_SINGLE_BASE_CHARGE = 65.0
PDF_DOUBLE_PRICE_PER_PAGE = 1.15
PDF_DOUBLE_BASE_CHARGE = 62.0

def get_required_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


SECRET_KEY = get_required_env("SECRET_KEY")
ALGORITHM = get_required_env("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(get_required_env("ACCESS_TOKEN_EXPIRE_MINUTES"))
RAZORPAY_KEY_ID = get_required_env("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = get_required_env("RAZORPAY_KEY_SECRET")
WEBHOOK_SECRET = get_required_env("WEBHOOK_SECRET")

DEFAULT_CORS_ORIGINS = [
    "https://demo-ashy-sigma.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

def build_cors_origins() -> list[str]:
    configured_origins: list[str] = []
    for env_name in ("FRONTEND_URL", "CORS_ORIGINS"):
        raw_value = os.getenv(env_name, "")
        if not raw_value:
            continue
        configured_origins.extend(
            origin.strip().rstrip("/")
            for origin in raw_value.split(",")
            if origin.strip()
        )

    merged_origins: list[str] = []
    for origin in [*DEFAULT_CORS_ORIGINS, *configured_origins]:
        normalized_origin = origin.strip().rstrip("/")
        if normalized_origin and normalized_origin not in merged_origins:
            merged_origins.append(normalized_origin)

    return merged_origins


CORS_ORIGINS = build_cors_origins()

UPLOAD_DIR = Path("app/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

models.Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(_: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    sync_schema()
    db = SessionLocal()
    try:
        migrate_legacy_passwords(db)
    finally:
        db.close()
    seed_defaults()
    yield


app = FastAPI(title="Batman Printing Backend", lifespan=lifespan)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("configured cors origins=%s", CORS_ORIGINS)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    first_error = exc.errors()[0] if exc.errors() else None
    message = first_error.get("msg", "Invalid request") if first_error else "Invalid request"
    if message.startswith("Value error, "):
        message = message.replace("Value error, ", "", 1)
    return JSONResponse(status_code=422, content={"detail": message})

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def sanitize_username(value: str) -> str:
    return value.strip().lower()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def is_password_hashed(password_value: str | None) -> bool:
    return bool(password_value) and pwd_context.identify(password_value) is not None


def verify_password(plain_password: str, stored_password_hash: str | None) -> bool:
    if not stored_password_hash:
        return False
    if is_password_hashed(stored_password_hash):
        return pwd_context.verify(plain_password, stored_password_hash)
    return plain_password == stored_password_hash


def migrate_legacy_passwords(db: Session):
    legacy_users = db.query(models.User).all()
    updated = 0
    for user in legacy_users:
        source_password = user.password_hash or user.password
        if source_password and not is_password_hashed(source_password):
            hashed_password = hash_password(source_password)
            user.password_hash = hashed_password
            user.password = hashed_password
            updated += 1
        elif user.password_hash and is_password_hashed(user.password_hash) and user.password != user.password_hash:
            user.password = user.password_hash
            updated += 1
    if updated:
        db.commit()
        logger.info("migrated legacy plaintext passwords count=%s", updated)


def get_login_key(request: Request, username: str) -> str:
    client_host = request.client.host if request.client else "unknown"
    return f"{client_host}:{sanitize_username(username).lower()}"


def is_rate_limited(login_key: str) -> bool:
    now = time.time()
    attempts = [attempt for attempt in login_attempts.get(login_key, []) if now - attempt < LOGIN_WINDOW_SECONDS]
    login_attempts[login_key] = attempts
    return len(attempts) >= LOGIN_MAX_ATTEMPTS


def record_failed_login(login_key: str):
    now = time.time()
    attempts = [attempt for attempt in login_attempts.get(login_key, []) if now - attempt < LOGIN_WINDOW_SECONDS]
    attempts.append(now)
    login_attempts[login_key] = attempts


def clear_failed_logins(login_key: str):
    login_attempts.pop(login_key, None)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(status_code=401, detail="Invalid authentication")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception

    return user


def require_admin(current_user: models.User):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")


def get_current_admin_user(
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def get_current_delivery_user(
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role not in {"admin", "delivery"}:
        raise HTTPException(status_code=403, detail="Delivery access required")
    return current_user


def normalize_mode(value: str | None):
    if not value:
        return None
    normalized = value.strip().lower().replace("&", "and").replace(" ", "_")
    mapping = {
        "black_and_white": "black_white",
        "blackwhite": "black_white",
        "bw": "black_white",
        "black_white": "black_white",
        "color": "color",
        "colour": "color",
    }
    return mapping.get(normalized, normalized)


def normalize_print_type(value: str | None):
    if not value:
        return ""
    normalized = value.strip().lower().replace("-", "_").replace(" ", "_")
    mapping = {
        "single_side": "single",
        "single": "single",
        "double_side": "double",
        "double": "double",
    }
    return mapping.get(normalized, normalized)


def validate_mode_or_raise(value: str | None):
    normalized = normalize_mode(value)
    if normalized not in {"black_white", "color"}:
        raise HTTPException(status_code=400, detail="Mode is required")
    return normalized


def validate_print_type_or_raise(value: str | None):
    normalized = normalize_print_type(value)
    if normalized not in {"single", "double"}:
        raise HTTPException(status_code=400, detail="Print type must be single or double")
    return normalized


def get_pdf_pricing_values(print_type: str | None):
    normalized_print_type = normalize_print_type(print_type) or "single"
    if normalized_print_type == "double":
        return {
            "print_type": "double",
            "price_per_page": PDF_DOUBLE_PRICE_PER_PAGE,
            "base_charge": PDF_DOUBLE_BASE_CHARGE,
        }
    return {
        "print_type": "single",
        "price_per_page": PDF_SINGLE_PRICE_PER_PAGE,
        "base_charge": PDF_SINGLE_BASE_CHARGE,
    }


def calculate_pdf_total(total_pages: int, print_type: str | None = None) -> float:
    pricing = get_pdf_pricing_values(print_type)
    return (total_pages * pricing["price_per_page"]) + pricing["base_charge"]


VALID_ORDER_STATUSES = {"pending", "paid", "printing", "ready", "delivered"}


def get_pending_print_queue_query(db: Session):
    return (
        db.query(models.OrderItem)
        .join(models.Order, models.Order.id == models.OrderItem.order_id)
        .filter(
            models.OrderItem.printed.is_(False),
            models.Order.status.in_(["paid", "printing", "ready"]),
        )
    )


def apply_print_queue_filters(query, item_name: str, mode: str | None, print_type: str):
    normalized_mode = normalize_mode(mode) if mode else None
    normalized_print_type = normalize_print_type(print_type)
    query = query.filter(models.OrderItem.item_name == item_name)
    if normalized_mode is None:
        query = query.filter(models.OrderItem.mode.is_(None))
    else:
        query = query.filter(models.OrderItem.mode == normalized_mode)
    return query.filter(models.OrderItem.print_type == normalized_print_type)


def encode_print_group_id(item_name: str, mode: str | None, print_type: str) -> str:
    raw = f"{item_name}|{mode or ''}|{normalize_print_type(print_type) or ''}"
    return base64.urlsafe_b64encode(raw.encode("utf-8")).decode("utf-8").rstrip("=")


def decode_print_group_id(group_id: str) -> tuple[str, str | None, str]:
    try:
        padded = group_id + "=" * (-len(group_id) % 4)
        decoded = base64.urlsafe_b64decode(padded.encode("utf-8")).decode("utf-8")
        item_name, mode, print_type = decoded.split("|", 2)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid print group")

    if not item_name:
        raise HTTPException(status_code=400, detail="Invalid print group")

    return item_name, (mode or None), print_type


def sync_schema():
    inspector = inspect(engine)
    expected_columns = {
        "books": {
            "requires_details": "ALTER TABLE books ADD COLUMN requires_details BOOLEAN DEFAULT FALSE",
            "is_pinned": "ALTER TABLE books ADD COLUMN is_pinned BOOLEAN DEFAULT FALSE",
        },
        "uploads": {
            "stored_filename": "ALTER TABLE uploads ADD COLUMN stored_filename VARCHAR",
            "original_filename": "ALTER TABLE uploads ADD COLUMN original_filename VARCHAR",
            "mode": "ALTER TABLE uploads ADD COLUMN mode VARCHAR",
            "created_at": "ALTER TABLE uploads ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        },
        "users": {
            "password_hash": "ALTER TABLE users ADD COLUMN password_hash VARCHAR",
        },
        "cart_items": {
            "book_id": "ALTER TABLE cart_items ADD COLUMN book_id INTEGER",
            "upload_id": "ALTER TABLE cart_items ADD COLUMN upload_id INTEGER",
            "mode": "ALTER TABLE cart_items ADD COLUMN mode VARCHAR",
            "print_type": "ALTER TABLE cart_items ADD COLUMN print_type VARCHAR",
            "item_name": "ALTER TABLE cart_items ADD COLUMN item_name VARCHAR",
            "unit_price": "ALTER TABLE cart_items ADD COLUMN unit_price FLOAT DEFAULT 0",
            "total_price": "ALTER TABLE cart_items ADD COLUMN total_price FLOAT DEFAULT 0",
            "leave_date": "ALTER TABLE cart_items ADD COLUMN leave_date VARCHAR",
            "leave_to_date": "ALTER TABLE cart_items ADD COLUMN leave_to_date VARCHAR",
            "request_reason": "ALTER TABLE cart_items ADD COLUMN request_reason VARCHAR",
        },
        "order_items": {
            "book_id": "ALTER TABLE order_items ADD COLUMN book_id INTEGER",
            "upload_id": "ALTER TABLE order_items ADD COLUMN upload_id INTEGER",
            "item_name": "ALTER TABLE order_items ADD COLUMN item_name VARCHAR",
            "stored_filename": "ALTER TABLE order_items ADD COLUMN stored_filename VARCHAR",
            "original_filename": "ALTER TABLE order_items ADD COLUMN original_filename VARCHAR",
            "total_pages": "ALTER TABLE order_items ADD COLUMN total_pages INTEGER",
            "mode": "ALTER TABLE order_items ADD COLUMN mode VARCHAR",
            "print_type": "ALTER TABLE order_items ADD COLUMN print_type VARCHAR",
            "unit_price": "ALTER TABLE order_items ADD COLUMN unit_price FLOAT DEFAULT 0",
            "total_price": "ALTER TABLE order_items ADD COLUMN total_price FLOAT DEFAULT 0",
            "printed": "ALTER TABLE order_items ADD COLUMN printed BOOLEAN DEFAULT FALSE",
            "leave_date": "ALTER TABLE order_items ADD COLUMN leave_date VARCHAR",
            "leave_to_date": "ALTER TABLE order_items ADD COLUMN leave_to_date VARCHAR",
            "request_reason": "ALTER TABLE order_items ADD COLUMN request_reason VARCHAR",
        },
        "support_threads": {
            "status": "ALTER TABLE support_threads ADD COLUMN status VARCHAR DEFAULT 'open'",
            "created_at": "ALTER TABLE support_threads ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
            "updated_at": "ALTER TABLE support_threads ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        },
        "support_messages": {
            "user_id": "ALTER TABLE support_messages ADD COLUMN user_id INTEGER",
            "sender_role": "ALTER TABLE support_messages ADD COLUMN sender_role VARCHAR DEFAULT 'user'",
            "created_at": "ALTER TABLE support_messages ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        },
    }

    with engine.begin() as connection:
        for table_name, ddl_map in expected_columns.items():
            if table_name not in inspector.get_table_names():
                continue
            existing = {column["name"] for column in inspector.get_columns(table_name)}
            for column_name, ddl in ddl_map.items():
                if column_name not in existing:
                    connection.execute(text(ddl))

        user_columns = {column["name"] for column in inspector.get_columns("users")} if "users" in inspector.get_table_names() else set()
        if "password_hash" in user_columns and "password" in user_columns:
            connection.execute(
                text(
                    "UPDATE users SET password_hash = password "
                    "WHERE (password_hash IS NULL OR password_hash = '') AND password IS NOT NULL"
                )
            )
            connection.execute(
                text(
                    "UPDATE users SET password = password_hash "
                    "WHERE password_hash IS NOT NULL AND (password IS NULL OR password = '')"
                )
            )

        for statement in [
            "CREATE INDEX IF NOT EXISTS ix_order_items_order_id ON order_items (order_id)",
            "CREATE INDEX IF NOT EXISTS ix_order_items_book_id ON order_items (book_id)",
            "CREATE INDEX IF NOT EXISTS ix_order_items_printed ON order_items (printed)",
            "CREATE INDEX IF NOT EXISTS ix_book_options_book_id ON book_options (book_id)",
            "CREATE INDEX IF NOT EXISTS ix_support_threads_user_id ON support_threads (user_id)",
            "CREATE INDEX IF NOT EXISTS ix_support_messages_thread_id ON support_messages (thread_id)",
        ]:
            connection.execute(text(statement))


def seed_defaults():
    db = SessionLocal()
    try:
        if db.query(models.PrintPricing).count() == 0:
            db.add_all(
                [
                    models.PrintPricing(mode="black_white", print_type="single", price_per_page=2.0),
                    models.PrintPricing(mode="black_white", print_type="double", price_per_page=1.5),
                    models.PrintPricing(mode="color", print_type="single", price_per_page=5.0),
                    models.PrintPricing(mode="color", print_type="double", price_per_page=4.0),
                ]
            )

        if db.query(models.Book).count() == 0:
            samples = [
                ("Engineering Math", "Y24", 120.0),
                ("Physics", "Y24", 100.0),
                ("Chemistry", "Y25", 140.0),
                ("Mechanics", "Y25", 110.0),
            ]
            for name, year, base_price in samples:
                book = models.Book(name=name, year=year, is_active=True)
                db.add(book)
                db.flush()
                db.add_all(
                    [
                        models.BookOption(book_id=book.id, mode="black_white", print_type="single", price=base_price),
                        models.BookOption(book_id=book.id, mode="black_white", print_type="double", price=base_price - 10),
                        models.BookOption(book_id=book.id, mode="color", print_type="single", price=base_price + 60),
                        models.BookOption(book_id=book.id, mode="color", print_type="double", price=base_price + 40),
                    ]
                )
        db.commit()
    finally:
        db.close()


def get_pdf_pricing_rule(db: Session, mode: str, print_type: str):
    rule = (
        db.query(models.PrintPricing)
        .filter(
            models.PrintPricing.mode == normalize_mode(mode),
            models.PrintPricing.print_type == normalize_print_type(print_type),
            models.PrintPricing.is_active.is_(True),
        )
        .first()
    )
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing rule not found")
    return rule


def get_book_option(db: Session, book_id: int, mode: str, print_type: str):
    normalized_mode = (mode or "").strip()
    normalized_print_type = normalize_print_type(print_type)
    query = db.query(models.BookOption).filter(models.BookOption.book_id == book_id)
    if normalized_print_type:
        query = query.filter(models.BookOption.print_type == normalized_print_type)
    else:
        query = query.filter(or_(models.BookOption.print_type.is_(None), models.BookOption.print_type == ""))
    if normalized_mode:
        query = query.filter(models.BookOption.mode == normalized_mode)
    else:
        query = query.filter(or_(models.BookOption.mode.is_(None), models.BookOption.mode == ""))

    option = query.first()
    if not option:
        raise HTTPException(status_code=404, detail="Book pricing option not found")
    return option


def normalize_book_mode(value: str | None):
    if value is None:
        return ""
    return value.strip()


def serialize_book(book: models.Book):
    options = [
        {
            "mode": option.mode,
            "print_type": option.print_type,
            "price": option.price,
        }
        for option in book.options
    ]
    return {
        "id": book.id,
        "name": book.name,
        "year": book.year,
        "requires_details": bool(getattr(book, "requires_details", False)),
        "is_pinned": bool(getattr(book, "is_pinned", False)),
        "options": options,
    }


def serialize_admin_book(book: models.Book):
    return {
        "id": book.id,
        "name": book.name,
        "year": book.year,
        "is_active": book.is_active,
        "requires_details": bool(getattr(book, "requires_details", False)),
        "is_pinned": bool(getattr(book, "is_pinned", False)),
        "options": [
            {
                "id": option.id,
                "book_id": option.book_id,
                "mode": option.mode,
                "print_type": option.print_type,
                "price": option.price,
            }
            for option in book.options
        ],
    }


def serialize_upload(upload: models.Upload):
    return {
        "id": upload.id,
        "stored_filename": upload.stored_filename,
        "original_filename": upload.original_filename,
        "file_path": upload.file_path,
        "total_pages": upload.total_pages,
        "mode": upload.mode,
        "print_type": upload.print_type,
        "quantity": upload.copies,
        "copies": upload.copies,
        "calculated_price": upload.calculated_price,
    }


def serialize_cart_item(item: models.CartItem):
    item_name = item.item_name
    if not item_name and item.book:
        item_name = item.book.name
    if not item_name and item.upload:
        item_name = item.upload.original_filename or item.upload.stored_filename

    return {
        "id": item.id,
        "item_type": item.item_type,
        "book_id": item.book_id,
        "upload_id": item.upload_id,
        "item_name": item_name or "",
        "mode": item.mode,
        "print_type": item.print_type,
        "quantity": item.quantity,
        "unit_price": item.unit_price,
        "total_price": item.total_price or item.calculated_price,
        "leave_date": item.leave_date,
        "leave_to_date": item.leave_to_date,
        "request_reason": item.request_reason,
        "upload": serialize_upload(item.upload) if item.upload else None,
    }


def serialize_order_item(item: models.OrderItem):
    item_name = item.item_name
    if not item_name and item.book:
        item_name = item.book.name
    if not item_name and item.upload:
        item_name = item.upload.original_filename or item.upload.stored_filename

    return {
        "id": item.id,
        "item_type": item.item_type,
        "book_id": item.book_id,
        "upload_id": item.upload_id,
        "item_name": item_name or "",
        "stored_filename": item.stored_filename,
        "original_filename": item.original_filename,
        "total_pages": item.total_pages,
        "mode": item.mode,
        "print_type": item.print_type,
        "quantity": item.quantity,
        "unit_price": item.unit_price,
        "total_price": item.total_price or item.calculated_price,
        "printed": item.printed,
        "leave_date": item.leave_date,
        "leave_to_date": item.leave_to_date,
        "request_reason": item.request_reason,
    }


def serialize_order(order: models.Order, include_user: bool = False):
    payload = {
        "id": order.id,
        "delivery_type": order.delivery_type,
        "hostel_name": order.hostel_name,
        "contact_number": order.contact_number,
        "alternate_contact_number": order.alternate_contact_number,
        "total_amount": order.total_amount,
        "status": order.status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "items": [serialize_order_item(item) for item in order.items],
    }
    if include_user:
        payload["user"] = {
            "id": order.user.id if order.user else None,
            "username": order.user.username if order.user else "",
        }
    return payload


def get_setting_value(db: Session, key: str, default: str | None = None) -> str | None:
    setting = db.query(models.AppSetting).filter(models.AppSetting.key == key).first()
    return setting.value if setting else default


def set_setting_value(db: Session, key: str, value: str):
    setting = db.query(models.AppSetting).filter(models.AppSetting.key == key).first()
    if not setting:
        setting = models.AppSetting(key=key, value=value)
        db.add(setting)
    else:
        setting.value = value
    db.commit()
    db.refresh(setting)
    return setting


def serialize_delivery_order(order: models.Order):
    return {
        "id": order.id,
        "delivery_type": order.delivery_type,
        "hostel_name": order.hostel_name,
        "contact_number": order.contact_number,
        "alternate_contact_number": order.alternate_contact_number,
        "status": order.status,
        "created_at": order.created_at.isoformat() if order.created_at else None,
        "user": {
            "id": order.user.id if order.user else None,
            "username": order.user.username if order.user else "",
        },
        "items": [
            {
                "id": item.id,
                "item_name": item.item_name or (item.book.name if item.book else item.original_filename or "Unnamed item"),
                "quantity": item.quantity,
                "stored_filename": item.stored_filename,
                "leave_date": item.leave_date,
                "leave_to_date": item.leave_to_date,
                "request_reason": item.request_reason,
            }
            for item in order.items
        ],
    }


def serialize_support_message(message: models.SupportMessage):
    return {
        "id": message.id,
        "user_id": message.user_id,
        "sender_role": message.sender_role,
        "message": message.message,
        "created_at": message.created_at.isoformat() if message.created_at else None,
    }


def serialize_support_thread(thread: models.SupportThread, include_user: bool = False):
    payload = {
        "id": thread.id,
        "status": thread.status,
        "created_at": thread.created_at.isoformat() if thread.created_at else None,
        "updated_at": thread.updated_at.isoformat() if thread.updated_at else None,
        "messages": [serialize_support_message(message) for message in thread.messages],
    }
    if include_user:
        payload["user"] = {
            "id": thread.user.id if thread.user else None,
            "username": thread.user.username if thread.user else "",
        }
    return payload


def cleanup_order_upload_files(order: models.Order, db: Session):
    deleted_files = 0
    for item in order.items:
        if not item.stored_filename:
            continue

        file_path = UPLOAD_DIR / item.stored_filename
        if file_path.exists():
            try:
                file_path.unlink()
                deleted_files += 1
            except OSError:
                logger.warning("failed to delete uploaded file path=%s order_id=%s", file_path, order.id)

        item.stored_filename = None
        if item.upload:
            item.upload.stored_filename = None
            item.upload.file_path = None

    return deleted_files

# -----------------------------
# ROOT
# -----------------------------

@app.get("/")
def root():
    return {"message": "Batman backend running"}

@app.post("/signup")
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    username = sanitize_username(user.username)
    existing_user = db.query(models.User).filter(models.User.username == username).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="Username already exists")

    hashed_password = hash_password(user.password)
    db.add(models.User(username=username, password_hash=hashed_password, password=hashed_password))
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        logger.exception("signup failed integrity error username=%s", username)
        raise HTTPException(status_code=409, detail="Username already exists")
    except Exception:
        db.rollback()
        logger.exception("signup failed username=%s", username)
        raise HTTPException(status_code=500, detail="Unable to create account")
    logger.info("signup success username=%s", username)
    return {"message": "User created"}


@app.post("/auth/signup")
def signup_alias(user: schemas.UserCreate, db: Session = Depends(get_db)):
    return signup(user=user, db=db)

@app.post("/login")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    username = sanitize_username(form_data.username)
    login_key = get_login_key(request, username)

    if is_rate_limited(login_key):
        logger.warning("login rate limited username=%s client=%s", username, request.client.host if request.client else "unknown")
        raise HTTPException(status_code=429, detail="Too many login attempts. Try again later.")

    logger.info("login attempt username=%s client=%s", username, request.client.host if request.client else "unknown")
    db_user = db.query(models.User).filter(models.User.username == username).first()
    if not db_user:
        record_failed_login(login_key)
        logger.warning("login failed unknown username=%s client=%s", username, request.client.host if request.client else "unknown")
        raise HTTPException(status_code=404, detail="No user found. Please sign up.")
    stored_password = db_user.password_hash or db_user.password
    if not verify_password(form_data.password, stored_password):
        record_failed_login(login_key)
        logger.warning("login failed bad password username=%s client=%s", username, request.client.host if request.client else "unknown")
        raise HTTPException(status_code=401, detail="Incorrect password.")

    if not is_password_hashed(stored_password):
        hashed_password = hash_password(form_data.password)
        db_user.password_hash = hashed_password
        db_user.password = hashed_password
        db.commit()
        db.refresh(db_user)
        logger.info("login upgraded legacy password hash username=%s", username)
    elif db_user.password != db_user.password_hash:
        db_user.password = db_user.password_hash
        db.commit()
        db.refresh(db_user)

    clear_failed_logins(login_key)

    token = create_access_token(
        data={
            "sub": str(db_user.id),
            "role": db_user.role,
            "username": db_user.username,
        }
    )
    logger.info("login success username=%s role=%s client=%s", db_user.username, db_user.role, request.client.host if request.client else "unknown")
    return {"access_token": token, "token_type": "bearer"}


@app.post("/auth/login")
def login_alias(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    return login(request=request, form_data=form_data, db=db)


@app.get("/me")
def me(current_user: models.User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username, "role": current_user.role}


@app.get("/books")
def get_books(db: Session = Depends(get_db)):
    books = (
        db.query(models.Book)
        .options(joinedload(models.Book.options))
        .filter(models.Book.is_active.is_(True))
        .order_by(models.Book.is_pinned.desc(), models.Book.name.asc())
        .all()
    )
    return [serialize_book(book) for book in books]


@app.get("/book-options/{book_id}")
def get_book_options(book_id: int, db: Session = Depends(get_db)):
    options = db.query(models.BookOption).filter(models.BookOption.book_id == book_id).all()
    return [
        {
            "mode": option.mode,
            "print_type": option.print_type,
            "price": option.price,
        }
        for option in options
    ]


@app.post("/admin/books")
def create_book(
    payload: schemas.BookCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)
    book = models.Book(
        name=payload.name.strip(),
        year=payload.year.strip(),
        is_active=True,
        requires_details=payload.requires_details,
        is_pinned=payload.is_pinned,
    )
    db.add(book)
    db.commit()
    db.refresh(book)
    logger.info("admin created book admin_id=%s book_id=%s", current_user.id, book.id)
    return serialize_admin_book(book)


@app.get("/admin/books")
def get_admin_books(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)
    books = db.query(models.Book).options(joinedload(models.Book.options)).order_by(models.Book.name.asc()).all()
    return [serialize_admin_book(book) for book in books]


@app.put("/admin/books/{book_id}")
def update_book(
    book_id: int,
    payload: schemas.BookUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    if payload.name is not None:
        book.name = payload.name.strip()
    if payload.year is not None:
        book.year = payload.year.strip()
    if payload.is_active is not None:
        book.is_active = payload.is_active
    if payload.requires_details is not None:
        book.requires_details = payload.requires_details
    if payload.is_pinned is not None:
        book.is_pinned = payload.is_pinned

    db.commit()
    db.refresh(book)
    logger.info("admin updated book admin_id=%s book_id=%s", current_user.id, book.id)
    return serialize_admin_book(book)


@app.delete("/admin/books/{book_id}")
def delete_book(
    book_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    db.delete(book)
    db.commit()
    logger.info("admin deleted book admin_id=%s book_id=%s", current_user.id, book_id)
    return {"message": "Book deleted"}


@app.post("/admin/book-options")
def create_book_option(
    payload: schemas.BookOptionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    book = db.query(models.Book).filter(models.Book.id == payload.book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    option = models.BookOption(
        book_id=payload.book_id,
        mode=(payload.mode or "").strip(),
        print_type=normalize_print_type(payload.print_type),
        price=payload.price,
        max_copies=payload.max_copies,
    )
    db.add(option)
    db.commit()
    db.refresh(option)
    logger.info("admin created book option admin_id=%s option_id=%s", current_user.id, option.id)
    return {
        "id": option.id,
        "book_id": option.book_id,
        "mode": option.mode,
        "print_type": option.print_type,
        "price": option.price,
    }


@app.put("/admin/book-options/{option_id}")
def update_book_option_admin(
    option_id: int,
    payload: schemas.BookOptionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    option = db.query(models.BookOption).filter(models.BookOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Book option not found")

    if payload.mode is not None:
        option.mode = payload.mode.strip()
    if payload.print_type is not None:
        option.print_type = normalize_print_type(payload.print_type)
    if payload.price is not None:
        option.price = payload.price
    if payload.max_copies is not None:
        option.max_copies = payload.max_copies

    db.commit()
    db.refresh(option)
    logger.info("admin updated book option admin_id=%s option_id=%s", current_user.id, option.id)
    return {
        "id": option.id,
        "book_id": option.book_id,
        "mode": option.mode,
        "print_type": option.print_type,
        "price": option.price,
    }


@app.delete("/admin/book-options/{option_id}")
def delete_book_option_admin(
    option_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    require_admin(current_user)

    option = db.query(models.BookOption).filter(models.BookOption.id == option_id).first()
    if not option:
        raise HTTPException(status_code=404, detail="Book option not found")

    db.delete(option)
    db.commit()
    logger.info("admin deleted book option admin_id=%s option_id=%s", current_user.id, option_id)
    return {"message": "Book option deleted"}


@app.get("/pricing/pdf")
def get_pdf_quote(
    total_pages: int,
    copies: int = 1,
    mode: str | None = None,
    print_type: str | None = None,
    db: Session = Depends(get_db),
):
    if total_pages <= 0 or copies <= 0:
        raise HTTPException(status_code=400, detail="Pages and copies must be positive")

    pricing = get_pdf_pricing_values(print_type)
    total_price = calculate_pdf_total(total_pages, print_type)
    return {
        "mode": None,
        "print_type": pricing["print_type"],
        "price_per_page": pricing["price_per_page"],
        "base_charge": pricing["base_charge"],
        "total_pages": total_pages,
        "copies": 1,
        "total_price": total_price,
    }


@app.post("/api/uploads/pdf")
@app.post("/upload-pdf")
async def upload_pdf(
    file: UploadFile = File(...),
    total_pages: int = Form(...),
    mode: str | None = Form(None),
    print_type: str | None = Form(None),
    copies: int | None = Form(None),
    quantity: int | None = Form(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    copies = 1
    if total_pages <= 0 or copies <= 0:
        raise HTTPException(status_code=400, detail="Pages and copies must be positive")
    normalized_print_type = validate_print_type_or_raise(print_type or "single")
    if file.content_type != "application/pdf" and not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    file.file.seek(0, 2)
    file_size = file.file.tell()
    file.file.seek(0)
    if file_size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="PDF must be smaller than 10 MB")

    extension = Path(file.filename or "document.pdf").suffix or ".pdf"
    stored_filename = f"{uuid.uuid4().hex}{extension}"
    destination = UPLOAD_DIR / stored_filename
    with destination.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    total_price = calculate_pdf_total(total_pages, normalized_print_type)
    upload = models.Upload(
        user_id=current_user.id,
        file_path=f"app/uploads/{stored_filename}",
        stored_filename=stored_filename,
        original_filename=file.filename,
        total_pages=total_pages,
        mode=None,
        print_type=normalized_print_type,
        copies=copies,
        calculated_price=total_price,
    )
    db.add(upload)
    db.commit()
    db.refresh(upload)
    return serialize_upload(upload)


@app.get("/cart")
def get_cart(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    items = (
        db.query(models.CartItem)
        .options(joinedload(models.CartItem.upload), joinedload(models.CartItem.book))
        .filter(models.CartItem.user_id == current_user.id)
        .all()
    )
    serialized = [serialize_cart_item(item) for item in items]
    return {"items": serialized, "total_amount": sum(item["total_price"] for item in serialized)}


@app.post("/cart/items")
def add_to_cart(
    payload: schemas.CartItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item_type = payload.item_type.lower()

    if item_type == "book":
        if not payload.book_id:
            raise HTTPException(status_code=400, detail="Book id is required")

        book = db.query(models.Book).filter(models.Book.id == payload.book_id).first()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")

        option = get_book_option(db, payload.book_id, payload.mode, payload.print_type)
        total_price = option.price * payload.quantity
        leave_date = payload.leave_date.strip() if payload.leave_date else None
        leave_to_date = payload.leave_to_date.strip() if payload.leave_to_date else None
        request_reason = payload.request_reason.strip() if payload.request_reason else None
        existing = (
            db.query(models.CartItem)
            .filter(
                models.CartItem.user_id == current_user.id,
                models.CartItem.item_type == "book",
                models.CartItem.book_id == payload.book_id,
                models.CartItem.mode == normalize_book_mode(option.mode),
                models.CartItem.print_type == option.print_type,
            )
            .first()
        )
        if existing:
            existing.quantity += payload.quantity
            existing.unit_price = option.price
            existing.total_price = existing.quantity * option.price
            existing.calculated_price = existing.total_price
            existing.leave_date = leave_date or existing.leave_date
            existing.leave_to_date = leave_to_date or existing.leave_to_date
            existing.request_reason = request_reason or existing.request_reason
            cart_item = existing
        else:
            cart_item = models.CartItem(
                user_id=current_user.id,
                item_type="book",
                reference_id=payload.book_id,
                book_id=payload.book_id,
                mode=normalize_book_mode(option.mode),
                print_type=option.print_type,
                item_name=book.name,
                quantity=payload.quantity,
                unit_price=option.price,
                total_price=total_price,
                calculated_price=total_price,
                leave_date=leave_date,
                leave_to_date=leave_to_date,
                request_reason=request_reason,
            )
            db.add(cart_item)
    elif item_type == "pdf":
        upload_query = db.query(models.Upload).filter(models.Upload.user_id == current_user.id)
        if payload.upload_id:
            upload_query = upload_query.filter(models.Upload.id == payload.upload_id)
        elif payload.stored_filename:
            upload_query = upload_query.filter(models.Upload.stored_filename == payload.stored_filename)
        else:
            raise HTTPException(status_code=400, detail="PDF items require upload_id or stored_filename")

        upload = upload_query.first()
        if not upload:
            raise HTTPException(status_code=404, detail="Upload not found")

        if payload.total_pages and upload.total_pages != payload.total_pages:
            upload.total_pages = payload.total_pages
        if payload.quantity:
            upload.copies = 1
            upload.calculated_price = calculate_pdf_total(upload.total_pages, upload.print_type)
        if payload.print_type:
            upload.print_type = validate_print_type_or_raise(payload.print_type)
            upload.calculated_price = calculate_pdf_total(upload.total_pages, upload.print_type)

        line_total = upload.calculated_price
        unit_price = line_total / max(upload.copies, 1)
        existing = (
            db.query(models.CartItem)
            .filter(
                models.CartItem.user_id == current_user.id,
                models.CartItem.item_type == "pdf",
                models.CartItem.upload_id == upload.id,
            )
            .first()
        )
        if existing:
            existing.quantity = upload.copies
            existing.unit_price = unit_price
            existing.total_price = line_total
            existing.calculated_price = line_total
            existing.item_name = upload.original_filename or upload.stored_filename
            existing.mode = upload.mode
            existing.print_type = upload.print_type
            cart_item = existing
        else:
            cart_item = models.CartItem(
                user_id=current_user.id,
                item_type="pdf",
                reference_id=upload.id,
                upload_id=upload.id,
                mode=upload.mode,
                print_type=upload.print_type,
                item_name=upload.original_filename or upload.stored_filename,
                quantity=upload.copies,
                unit_price=unit_price,
                total_price=line_total,
                calculated_price=line_total,
            )
            db.add(cart_item)
    else:
        raise HTTPException(status_code=400, detail="Unsupported cart item type")

    db.commit()
    db.refresh(cart_item)
    return serialize_cart_item(cart_item)


@app.delete("/cart/items/{item_id}")
def remove_cart_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.CartItem)
        .filter(models.CartItem.id == item_id, models.CartItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    db.delete(item)
    db.commit()
    return {"message": "Cart item removed"}


@app.patch("/cart/items/{item_id}")
def update_cart_item(
    item_id: int,
    payload: schemas.CartItemUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    item = (
        db.query(models.CartItem)
        .options(joinedload(models.CartItem.upload), joinedload(models.CartItem.book))
        .filter(models.CartItem.id == item_id, models.CartItem.user_id == current_user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    item.quantity = payload.quantity

    if item.item_type == "book":
        item.total_price = payload.quantity * item.unit_price
        item.calculated_price = item.total_price
    elif item.item_type == "pdf":
        item.total_price = payload.quantity * item.unit_price
        item.calculated_price = item.total_price
        if item.upload:
            item.upload.copies = payload.quantity
            item.upload.calculated_price = item.total_price
    else:
        raise HTTPException(status_code=400, detail="Unsupported cart item type")

    db.commit()
    db.refresh(item)
    return serialize_cart_item(item)

@app.post("/orders")
def create_order(
    order: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    cart_items = (
        db.query(models.CartItem)
        .options(joinedload(models.CartItem.upload), joinedload(models.CartItem.book))
        .filter(models.CartItem.user_id == current_user.id)
        .all()
    )
    if not cart_items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    total_amount = sum((item.total_price or item.calculated_price or 0) for item in cart_items)
    new_order = models.Order(
        user_id=current_user.id,
        delivery_type=order.delivery_type,
        hostel_name=order.hostel_name,
        contact_number=order.contact_number,
        alternate_contact_number=order.alternate_contact_number,
        total_amount=total_amount,
        status="pending",
    )
    db.add(new_order)
    db.flush()

    for cart_item in cart_items:
        upload = cart_item.upload
        db.add(
            models.OrderItem(
                order_id=new_order.id,
                item_type=cart_item.item_type,
                reference_id=cart_item.reference_id,
                book_id=cart_item.book_id,
                upload_id=cart_item.upload_id,
                item_name=cart_item.item_name,
                stored_filename=upload.stored_filename if upload else None,
                original_filename=upload.original_filename if upload else None,
                total_pages=upload.total_pages if upload else None,
                mode=cart_item.mode,
                print_type=cart_item.print_type,
                quantity=cart_item.quantity,
                unit_price=cart_item.unit_price,
                calculated_price=cart_item.calculated_price,
                total_price=cart_item.total_price or cart_item.calculated_price,
                leave_date=cart_item.leave_date,
                leave_to_date=cart_item.leave_to_date,
                request_reason=cart_item.request_reason,
            )
        )

    db.commit()
    db.refresh(new_order)
    logger.info("order created order_id=%s user_id=%s total=%s", new_order.id, current_user.id, new_order.total_amount)
    return {"order_id": new_order.id, "total_amount": new_order.total_amount}


@app.post("/order/create")
def create_order_legacy(
    order: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return create_order(order=order, db=db, current_user=current_user)


@app.post("/payment/create/{order_id}")
def create_payment(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    order = (
        db.query(models.Order)
        .filter(models.Order.id == order_id, models.Order.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    try:
        razorpay_order = razorpay_client.order.create(
            {"amount": int(order.total_amount * 100), "currency": "INR", "payment_capture": 1}
        )
    except Exception:
        logger.exception("payment order creation failed order_id=%s user_id=%s", order.id, current_user.id)
        raise HTTPException(status_code=502, detail="Unable to create payment order")
    order.razorpay_order_id = razorpay_order["id"]
    db.commit()
    logger.info("payment order created order_id=%s user_id=%s razorpay_order_id=%s", order.id, current_user.id, order.razorpay_order_id)
    return {
        **razorpay_order,
        "key_id": RAZORPAY_KEY_ID,
    }


@app.post("/payment/verify")
def verify_payment(
    payload: schemas.PaymentVerification,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        razorpay_client.utility.verify_payment_signature(
            {
                "razorpay_order_id": payload.razorpay_order_id,
                "razorpay_payment_id": payload.razorpay_payment_id,
                "razorpay_signature": payload.razorpay_signature,
            }
        )
    except Exception:
        logger.warning("payment verification failed user_id=%s razorpay_order_id=%s", current_user.id, payload.razorpay_order_id)
        raise HTTPException(status_code=400, detail="Payment verification failed")

    order = (
        db.query(models.Order)
        .filter(
            models.Order.razorpay_order_id == payload.razorpay_order_id,
            models.Order.user_id == current_user.id,
        )
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = "paid"
    order.razorpay_payment_id = payload.razorpay_payment_id
    db.query(models.CartItem).filter(models.CartItem.user_id == current_user.id).delete()
    db.commit()
    logger.info("payment verified order_id=%s user_id=%s", order.id, current_user.id)
    return {"message": "Payment verified"}


@app.get("/my-orders")
def my_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    orders = (
        db.query(models.Order)
        .options(
            joinedload(models.Order.items).joinedload(models.OrderItem.book),
            joinedload(models.Order.items).joinedload(models.OrderItem.upload),
        )
        .filter(models.Order.user_id == current_user.id)
        .order_by(models.Order.created_at.desc())
        .all()
    )
    return [serialize_order(order) for order in orders]


@app.get("/support-threads")
def my_support_threads(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    threads = (
        db.query(models.SupportThread)
        .options(joinedload(models.SupportThread.messages))
        .filter(models.SupportThread.user_id == current_user.id)
        .order_by(models.SupportThread.updated_at.desc())
        .all()
    )
    return [serialize_support_thread(thread) for thread in threads]


@app.post("/support-threads")
def create_support_thread(
    payload: schemas.SupportMessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    thread = models.SupportThread(
        user_id=current_user.id,
        status="open",
        created_at=now,
        updated_at=now,
    )
    db.add(thread)
    db.flush()
    db.add(
        models.SupportMessage(
            thread_id=thread.id,
            user_id=current_user.id,
            sender_role="user",
            message=payload.message.strip(),
            created_at=now,
        )
    )
    db.commit()
    db.refresh(thread)
    logger.info("support thread created user_id=%s thread_id=%s", current_user.id, thread.id)
    thread = (
        db.query(models.SupportThread)
        .options(joinedload(models.SupportThread.messages))
        .filter(models.SupportThread.id == thread.id)
        .first()
    )
    return serialize_support_thread(thread)


@app.post("/support-threads/{thread_id}/messages")
def add_support_message(
    thread_id: int,
    payload: schemas.SupportMessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    thread = (
        db.query(models.SupportThread)
        .options(joinedload(models.SupportThread.messages))
        .filter(models.SupportThread.id == thread_id, models.SupportThread.user_id == current_user.id)
        .first()
    )
    if not thread:
        raise HTTPException(status_code=404, detail="Support thread not found")

    thread.status = "open"
    thread.updated_at = datetime.now(timezone.utc)
    db.add(
        models.SupportMessage(
            thread_id=thread.id,
            user_id=current_user.id,
            sender_role="user",
            message=payload.message.strip(),
        )
    )
    db.commit()
    thread = (
        db.query(models.SupportThread)
        .options(joinedload(models.SupportThread.messages))
        .filter(models.SupportThread.id == thread.id)
        .first()
    )
    logger.info("support reply added user_id=%s thread_id=%s", current_user.id, thread.id)
    return serialize_support_thread(thread)


@app.get("/admin/orders")
def admin_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    orders = (
        db.query(models.Order)
        .options(
            joinedload(models.Order.items).joinedload(models.OrderItem.book),
            joinedload(models.Order.items).joinedload(models.OrderItem.upload),
            joinedload(models.Order.user),
        )
        .order_by(models.Order.created_at.desc())
        .all()
    )
    return [serialize_order(order, include_user=True) for order in orders]


@app.get("/delivery/orders")
def delivery_orders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_delivery_user),
):
    orders = (
        db.query(models.Order)
        .options(
            joinedload(models.Order.items).joinedload(models.OrderItem.book),
            joinedload(models.Order.items).joinedload(models.OrderItem.upload),
            joinedload(models.Order.user),
        )
        .filter(models.Order.status.in_(["ready", "printing"]))
        .order_by(models.Order.created_at.desc())
        .all()
    )
    return [serialize_delivery_order(order) for order in orders]


@app.put("/delivery/orders/{order_id}/delivered")
def mark_delivery_order_delivered(
    order_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_delivery_user),
):
    order = (
        db.query(models.Order)
        .options(joinedload(models.Order.items).joinedload(models.OrderItem.upload))
        .filter(models.Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = "delivered"
    db.commit()
    logger.info(
        "delivery order marked delivered user_id=%s role=%s order_id=%s",
        current_user.id,
        current_user.role,
        order_id,
    )
    return {"message": "Order marked delivered"}


@app.get("/admin/support-threads")
def admin_support_threads(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    threads = (
        db.query(models.SupportThread)
        .options(joinedload(models.SupportThread.messages), joinedload(models.SupportThread.user))
        .order_by(models.SupportThread.updated_at.desc())
        .all()
    )
    return [serialize_support_thread(thread, include_user=True) for thread in threads]


@app.post("/admin/support-threads/{thread_id}/reply")
def admin_reply_support_thread(
    thread_id: int,
    payload: schemas.SupportMessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    thread = (
        db.query(models.SupportThread)
        .options(joinedload(models.SupportThread.messages), joinedload(models.SupportThread.user))
        .filter(models.SupportThread.id == thread_id)
        .first()
    )
    if not thread:
        raise HTTPException(status_code=404, detail="Support thread not found")

    thread.status = "answered"
    thread.updated_at = datetime.now(timezone.utc)
    db.add(
        models.SupportMessage(
            thread_id=thread.id,
            user_id=current_user.id,
            sender_role="admin",
            message=payload.message.strip(),
        )
    )
    db.commit()
    thread = (
        db.query(models.SupportThread)
        .options(joinedload(models.SupportThread.messages), joinedload(models.SupportThread.user))
        .filter(models.SupportThread.id == thread.id)
        .first()
    )
    logger.info("admin replied support thread admin_id=%s thread_id=%s", current_user.id, thread.id)
    return serialize_support_thread(thread, include_user=True)


@app.get("/admin/analytics")
def admin_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    total_orders = db.query(func.count(models.Order.id)).scalar() or 0
    pending_orders = db.query(func.count(models.Order.id)).filter(models.Order.status == "pending").scalar() or 0
    printing_orders = db.query(func.count(models.Order.id)).filter(models.Order.status == "printing").scalar() or 0
    completed_orders = db.query(func.count(models.Order.id)).filter(models.Order.status == "delivered").scalar() or 0
    total_revenue = (
        db.query(func.coalesce(func.sum(models.Order.total_amount), 0))
        .filter(models.Order.status.in_(["paid", "printing", "ready", "delivered"]))
        .scalar()
        or 0
    )
    revenue_offset = float(get_setting_value(db, "revenue_offset", "0") or 0)
    return {
        "total_orders": int(total_orders),
        "pending_orders": int(pending_orders),
        "printing_orders": int(printing_orders),
        "completed_orders": int(completed_orders),
        "total_revenue": max(float(total_revenue) - revenue_offset, 0.0),
    }


@app.get("/admin/dashboard")
def admin_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    return admin_analytics(db=db, current_user=current_user)


@app.post("/admin/dashboard/reset-revenue")
def admin_reset_revenue(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    gross_revenue = (
        db.query(func.coalesce(func.sum(models.Order.total_amount), 0))
        .filter(models.Order.status.in_(["paid", "printing", "ready", "delivered"]))
        .scalar()
        or 0
    )
    set_setting_value(db, "revenue_offset", str(float(gross_revenue)))
    logger.info("admin reset revenue admin_id=%s gross_revenue=%s", current_user.id, gross_revenue)
    return {"message": "Revenue reset", "total_revenue": 0.0}


@app.put("/admin/orders/{order_id}/status")
def update_order_status(
    order_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    if status not in VALID_ORDER_STATUSES:
        raise HTTPException(status_code=400, detail="Invalid order status")

    order = (
        db.query(models.Order)
        .options(joinedload(models.Order.items).joinedload(models.OrderItem.upload))
        .filter(models.Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = status
    db.commit()
    logger.info(
        "admin updated order status admin_id=%s order_id=%s status=%s",
        current_user.id,
        order_id,
        status,
    )
    return {"message": "Order status updated"}


@app.put("/admin/update-order-status/{order_id}")
def update_order_status_legacy(
    order_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    return update_order_status(order_id=order_id, status=status, db=db, current_user=current_user)


@app.delete("/admin/order-items/{item_id}/file")
def delete_order_item_file(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    item = (
        db.query(models.OrderItem)
        .options(joinedload(models.OrderItem.upload))
        .filter(models.OrderItem.id == item_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")

    if not item.stored_filename:
        raise HTTPException(status_code=404, detail="Uploaded file not found")

    file_path = UPLOAD_DIR / item.stored_filename
    if file_path.exists():
        try:
            file_path.unlink()
        except OSError:
            logger.warning("failed to delete uploaded file item_id=%s path=%s", item.id, file_path)
            raise HTTPException(status_code=500, detail="Unable to delete uploaded file")

    item.stored_filename = None
    if item.upload:
        item.upload.stored_filename = None
        item.upload.file_path = None

    db.commit()
    logger.info("admin deleted uploaded file admin_id=%s item_id=%s", current_user.id, item.id)
    return {"message": "Uploaded file deleted"}


@app.get("/admin/print-summary")
def admin_print_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    summary = (
        get_pending_print_queue_query(db)
        .with_entities(
            models.OrderItem.item_name.label("item_name"),
            models.OrderItem.mode.label("mode"),
            models.OrderItem.print_type.label("print_type"),
            func.sum(models.OrderItem.quantity).label("quantity"),
        )
        .group_by(
            models.OrderItem.item_name,
            models.OrderItem.mode,
            models.OrderItem.print_type,
        )
        .order_by(models.OrderItem.item_name.asc())
        .all()
    )

    logger.info("admin viewed print summary admin_id=%s groups=%s", current_user.id, len(summary))
    return [
        {
            "item_name": row.item_name or "Unnamed item",
            "mode": row.mode,
            "print_type": row.print_type,
            "quantity": int(row.quantity or 0),
        }
        for row in summary
    ]


@app.get("/admin/print-queue")
def admin_print_queue(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    summary = admin_print_summary(db=db, current_user=current_user)
    return [
        {
            **item,
            "group_id": encode_print_group_id(item["item_name"], item["mode"], item["print_type"]),
        }
        for item in summary
    ]


@app.post("/admin/print-complete")
def admin_print_complete(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    pending_item_ids = [
        item.id for item in get_pending_print_queue_query(db).all()
    ]

    updated_count = 0
    if pending_item_ids:
        updated_count = (
            db.query(models.OrderItem)
            .filter(models.OrderItem.id.in_(pending_item_ids))
            .update({"printed": True}, synchronize_session=False)
        )
    db.commit()
    logger.info("admin completed print queue admin_id=%s updated_count=%s", current_user.id, updated_count)
    return {"message": "Print queue marked completed", "updated_count": updated_count}


@app.post("/admin/print-queue/start")
def admin_print_queue_start(
    payload: schemas.PrintQueueAction,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    queue_items = apply_print_queue_filters(
        get_pending_print_queue_query(db),
        payload.item_name,
        payload.mode,
        payload.print_type,
    ).all()
    if not queue_items:
        raise HTTPException(status_code=404, detail="Print queue item not found")

    order_ids = {item.order_id for item in queue_items}
    (
        db.query(models.Order)
        .filter(models.Order.id.in_(order_ids))
        .update({"status": "printing"}, synchronize_session=False)
    )
    db.commit()
    logger.info("admin started print queue admin_id=%s item=%s orders=%s", current_user.id, payload.item_name, len(order_ids))
    return {"message": "Printing started"}


@app.post("/admin/start-print/{group_id}")
def admin_start_print_by_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    item_name, mode, print_type = decode_print_group_id(group_id)
    payload = schemas.PrintQueueAction(item_name=item_name, mode=mode, print_type=print_type)
    return admin_print_queue_start(payload=payload, db=db, current_user=current_user)


@app.post("/admin/print-queue/complete")
def admin_print_queue_complete(
    payload: schemas.PrintQueueAction,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    queue_items = apply_print_queue_filters(
        get_pending_print_queue_query(db),
        payload.item_name,
        payload.mode,
        payload.print_type,
    ).all()
    if not queue_items:
        raise HTTPException(status_code=404, detail="Print queue item not found")

    item_ids = [item.id for item in queue_items]
    (
        db.query(models.OrderItem)
        .filter(models.OrderItem.id.in_(item_ids))
        .update({"printed": True}, synchronize_session=False)
    )
    db.commit()
    logger.info("admin completed print queue group admin_id=%s item=%s count=%s", current_user.id, payload.item_name, len(item_ids))
    return {"message": "Queue item marked printed"}


@app.post("/admin/mark-printed/{group_id}")
def admin_mark_printed_by_group(
    group_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user),
):
    item_name, mode, print_type = decode_print_group_id(group_id)
    payload = schemas.PrintQueueAction(item_name=item_name, mode=mode, print_type=print_type)
    return admin_print_queue_complete(payload=payload, db=db, current_user=current_user)
