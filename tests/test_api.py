import importlib
import os
import sys
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


TEST_DB_PATH = Path(tempfile.gettempdir()) / "batprint_test.sqlite3"


@pytest.fixture(scope="session")
def app_module():
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()

    os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH.as_posix()}"
    os.environ["SECRET_KEY"] = "test-secret-key"
    os.environ["ALGORITHM"] = "HS256"
    os.environ["ACCESS_TOKEN_EXPIRE_MINUTES"] = "30"
    os.environ["RAZORPAY_KEY_ID"] = "rzp_test_key"
    os.environ["RAZORPAY_KEY_SECRET"] = "rzp_test_secret"
    os.environ["WEBHOOK_SECRET"] = "test-webhook-secret"
    os.environ["FRONTEND_URL"] = "http://localhost:5173"

    for module_name in ["app.main", "app.models", "app.schemas", "app.database"]:
        sys.modules.pop(module_name, None)

    module = importlib.import_module("app.main")
    yield module

    module.engine.dispose()
    if TEST_DB_PATH.exists():
        TEST_DB_PATH.unlink()


@pytest.fixture()
def reset_db(app_module):
    app_module.models.Base.metadata.drop_all(bind=app_module.engine)
    app_module.models.Base.metadata.create_all(bind=app_module.engine)
    app_module.sync_schema()
    app_module.seed_defaults()


@pytest.fixture()
def client(app_module, reset_db):
    with TestClient(app_module.app) as test_client:
        yield test_client


def signup(client, username="testuser", password="Strongpass123!"):
    return client.post(
        "/signup",
        json={"username": username, "password": password},
    )


def login(client, username="testuser", password="Strongpass123!"):
    return client.post(
        "/login",
        data={"username": username, "password": password},
    )


def create_admin(app_module, username="adminuser", password="Strongpass123!"):
    db = app_module.SessionLocal()
    try:
        admin = app_module.models.User(
            username=username,
            password_hash=app_module.pwd_context.hash(password),
            role="admin",
        )
        db.add(admin)
        db.commit()
    finally:
        db.close()


def create_delivery_user(app_module, username="deliveryuser", password="Strongpass123!"):
    db = app_module.SessionLocal()
    try:
        delivery_user = app_module.models.User(
            username=username,
            password_hash=app_module.pwd_context.hash(password),
            role="delivery",
        )
        db.add(delivery_user)
        db.commit()
    finally:
        db.close()


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_signup_rejects_duplicate_username(client):
    first = signup(client)
    second = signup(client)

    assert first.status_code == 200
    assert second.status_code == 409
    assert second.json()["detail"] == "Username already exists"


def test_login_rejects_invalid_credentials(client):
    signup(client)
    response = login(client, password="Wrongpass123!")

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect password."


def test_invalid_token_returns_401(client):
    response = client.get("/cart", headers=auth_headers("not-a-real-token"))

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid authentication"


def test_login_returns_user_not_found_for_missing_user(client):
    response = login(client, username="missing-user")

    assert response.status_code == 404
    assert response.json()["detail"] == "No user found. Please sign up."


def test_login_is_case_insensitive(client):
    signup(client, username="AbHiNaV", password="Strongpass123!")
    response = login(client, username="ABHINAV", password="Strongpass123!")

    assert response.status_code == 200
    assert response.json()["access_token"]


def test_signup_rejects_weak_password(client):
    response = signup(client, username="secureuser", password="123")

    assert response.status_code == 422
    assert response.json()["detail"] == "Password must be at least 4 characters"


def test_non_admin_cannot_access_dashboard(client):
    signup(client)
    token = login(client).json()["access_token"]

    response = client.get("/admin/dashboard", headers=auth_headers(token))

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access required"


def test_delivery_role_can_view_and_complete_delivery_orders(client, app_module):
    signup(client, username="buyer")
    buyer_token = login(client, username="buyer").json()["access_token"]

    books_response = client.get("/books", headers=auth_headers(buyer_token))
    first_book = books_response.json()[0]
    first_option = first_book["options"][0]

    add_cart_response = client.post(
        "/cart/items",
        json={
            "item_type": "book",
            "book_id": first_book["id"],
            "mode": first_option["mode"],
            "print_type": first_option["print_type"],
            "quantity": 1,
        },
        headers=auth_headers(buyer_token),
    )
    assert add_cart_response.status_code == 200

    order_response = client.post(
        "/orders",
        json={
            "delivery_type": "hostel",
            "hostel_name": "Himalaya",
            "contact_number": "9876543210",
            "alternate_contact_number": "",
        },
        headers=auth_headers(buyer_token),
    )
    assert order_response.status_code == 200
    order_id = order_response.json()["order_id"]

    create_admin(app_module)
    admin_token = login(client, username="adminuser").json()["access_token"]
    ready_response = client.put(
        f"/admin/orders/{order_id}/status?status=ready",
        headers=auth_headers(admin_token),
    )
    assert ready_response.status_code == 200

    create_delivery_user(app_module)
    delivery_token = login(client, username="deliveryuser").json()["access_token"]

    delivery_orders_response = client.get("/delivery/orders", headers=auth_headers(delivery_token))
    assert delivery_orders_response.status_code == 200
    delivery_orders = delivery_orders_response.json()
    assert len(delivery_orders) == 1
    assert delivery_orders[0]["contact_number"] == "9876543210"
    assert delivery_orders[0]["hostel_name"] == "Himalaya"
    assert len(delivery_orders[0]["items"]) == 1

    delivered_response = client.put(
        f"/delivery/orders/{order_id}/delivered",
        headers=auth_headers(delivery_token),
    )
    assert delivered_response.status_code == 200
    assert delivered_response.json()["message"] == "Order marked delivered"

    empty_response = client.get("/delivery/orders", headers=auth_headers(delivery_token))
    assert empty_response.status_code == 200
    assert empty_response.json() == []


def test_admin_can_reset_revenue(client, app_module):
    signup(client, username="buyer")
    buyer_token = login(client, username="buyer").json()["access_token"]

    books_response = client.get("/books", headers=auth_headers(buyer_token))
    first_book = books_response.json()[0]
    first_option = first_book["options"][0]

    client.post(
        "/cart/items",
        json={
            "item_type": "book",
            "book_id": first_book["id"],
            "mode": first_option["mode"],
            "print_type": first_option["print_type"],
            "quantity": 1,
        },
        headers=auth_headers(buyer_token),
    )
    order_response = client.post(
        "/orders",
        json={
            "delivery_type": "hostel",
            "hostel_name": "Himalaya",
            "contact_number": "9876543210",
            "alternate_contact_number": "",
        },
        headers=auth_headers(buyer_token),
    )
    order_id = order_response.json()["order_id"]

    create_admin(app_module)
    admin_token = login(client, username="adminuser").json()["access_token"]
    client.put(
        f"/admin/orders/{order_id}/status?status=paid",
        headers=auth_headers(admin_token),
    )

    dashboard_response = client.get("/admin/dashboard", headers=auth_headers(admin_token))
    assert dashboard_response.status_code == 200
    assert dashboard_response.json()["total_revenue"] > 0

    reset_response = client.post("/admin/dashboard/reset-revenue", headers=auth_headers(admin_token))
    assert reset_response.status_code == 200
    assert reset_response.json()["total_revenue"] == 0.0

    refreshed_dashboard = client.get("/admin/dashboard", headers=auth_headers(admin_token))
    assert refreshed_dashboard.status_code == 200
    assert refreshed_dashboard.json()["total_revenue"] == 0.0


def test_book_can_have_simple_price_without_mode_or_side(client, app_module):
    create_admin(app_module)
    admin_token = login(client, username="adminuser").json()["access_token"]

    create_book_response = client.post(
        "/admin/books",
        json={"name": "Simple Book", "year": "Y26"},
        headers=auth_headers(admin_token),
    )
    assert create_book_response.status_code == 200
    book_id = create_book_response.json()["id"]

    option_response = client.post(
        "/admin/book-options",
        json={
            "book_id": book_id,
            "mode": "",
            "print_type": "",
            "price": 99,
        },
        headers=auth_headers(admin_token),
    )
    assert option_response.status_code == 200
    assert option_response.json()["print_type"] == ""

    signup(client, username="simplebuyer")
    buyer_token = login(client, username="simplebuyer").json()["access_token"]

    add_cart_response = client.post(
        "/cart/items",
        json={
            "item_type": "book",
            "book_id": book_id,
            "quantity": 1,
        },
        headers=auth_headers(buyer_token),
    )
    assert add_cart_response.status_code == 200
    assert add_cart_response.json()["print_type"] == ""
    assert add_cart_response.json()["mode"] == ""


def test_special_request_book_carries_leave_date_and_reason(client, app_module):
    create_admin(app_module)
    admin_token = login(client, username="adminuser").json()["access_token"]

    create_book_response = client.post(
        "/admin/books",
        json={"name": "Leave Card", "year": "Y26", "requires_details": True},
        headers=auth_headers(admin_token),
    )
    assert create_book_response.status_code == 200
    book_id = create_book_response.json()["id"]
    assert create_book_response.json()["requires_details"] is True

    option_response = client.post(
        "/admin/book-options",
        json={"book_id": book_id, "mode": "", "print_type": "", "price": 150},
        headers=auth_headers(admin_token),
    )
    assert option_response.status_code == 200

    signup(client, username="leavebuyer")
    buyer_token = login(client, username="leavebuyer").json()["access_token"]

    add_cart_response = client.post(
        "/cart/items",
        json={
            "item_type": "book",
            "book_id": book_id,
            "quantity": 1,
            "leave_date": "2026-03-20",
            "leave_to_date": "2026-03-25",
            "request_reason": "Need approval for leave",
        },
        headers=auth_headers(buyer_token),
    )
    assert add_cart_response.status_code == 200
    assert add_cart_response.json()["leave_date"] == "2026-03-20"
    assert add_cart_response.json()["leave_to_date"] == "2026-03-25"
    assert add_cart_response.json()["request_reason"] == "Need approval for leave"

    order_response = client.post(
        "/orders",
        json={
            "delivery_type": "hostel",
            "hostel_name": "Himalaya",
            "contact_number": "9876543210",
            "alternate_contact_number": "",
        },
        headers=auth_headers(buyer_token),
    )
    assert order_response.status_code == 200

    admin_orders_response = client.get("/admin/orders", headers=auth_headers(admin_token))
    assert admin_orders_response.status_code == 200
    admin_order_items = admin_orders_response.json()[0]["items"]
    assert admin_order_items[0]["leave_date"] == "2026-03-20"
    assert admin_order_items[0]["leave_to_date"] == "2026-03-25"
    assert admin_order_items[0]["request_reason"] == "Need approval for leave"


def test_pinned_books_are_shown_first(client, app_module):
    create_admin(app_module)
    admin_token = login(client, username="adminuser").json()["access_token"]

    pinned_response = client.post(
        "/admin/books",
        json={"name": "Pinned Book", "year": "Y26", "is_pinned": True},
        headers=auth_headers(admin_token),
    )
    assert pinned_response.status_code == 200

    normal_response = client.post(
        "/admin/books",
        json={"name": "Normal Book", "year": "Y26", "is_pinned": False},
        headers=auth_headers(admin_token),
    )
    assert normal_response.status_code == 200

    books_response = client.get("/books")
    assert books_response.status_code == 200
    books = books_response.json()
    pinned_index = next(i for i, book in enumerate(books) if book["name"] == "Pinned Book")
    normal_index = next(i for i, book in enumerate(books) if book["name"] == "Normal Book")
    assert pinned_index < normal_index


def test_order_and_print_queue_flow(client, app_module):
    signup(client, username="buyer")
    buyer_token = login(client, username="buyer").json()["access_token"]

    books_response = client.get("/books", headers=auth_headers(buyer_token))
    assert books_response.status_code == 200
    first_book = books_response.json()[0]
    first_option = first_book["options"][0]

    add_cart_response = client.post(
        "/cart/items",
        json={
            "item_type": "book",
            "book_id": first_book["id"],
            "mode": first_option["mode"],
            "print_type": first_option["print_type"],
            "quantity": 2,
        },
        headers=auth_headers(buyer_token),
    )
    assert add_cart_response.status_code == 200

    order_response = client.post(
        "/orders",
        json={
            "delivery_type": "hostel",
            "hostel_name": "A Block",
            "contact_number": "9876543210",
            "alternate_contact_number": "9876543211",
        },
        headers=auth_headers(buyer_token),
    )
    assert order_response.status_code == 200
    order_id = order_response.json()["order_id"]

    create_admin(app_module)
    admin_token = login(client, username="adminuser").json()["access_token"]

    dashboard_response = client.get("/admin/dashboard", headers=auth_headers(admin_token))
    assert dashboard_response.status_code == 200
    assert dashboard_response.json()["total_orders"] == 1
    assert dashboard_response.json()["pending_orders"] == 1

    set_paid_response = client.put(
        f"/admin/orders/{order_id}/status?status=paid",
        headers=auth_headers(admin_token),
    )
    assert set_paid_response.status_code == 200

    queue_response = client.get("/admin/print-queue", headers=auth_headers(admin_token))
    assert queue_response.status_code == 200
    queue_items = queue_response.json()
    assert len(queue_items) == 1
    assert queue_items[0]["quantity"] == 2
    assert queue_items[0]["group_id"]

    start_response = client.post(
        f"/admin/start-print/{queue_items[0]['group_id']}",
        headers=auth_headers(admin_token),
    )
    assert start_response.status_code == 200
    assert start_response.json()["message"] == "Printing started"

    complete_response = client.post(
        f"/admin/mark-printed/{queue_items[0]['group_id']}",
        headers=auth_headers(admin_token),
    )
    assert complete_response.status_code == 200
    assert complete_response.json()["message"] == "Queue item marked printed"

    empty_queue_response = client.get("/admin/print-queue", headers=auth_headers(admin_token))
    assert empty_queue_response.status_code == 200
    assert empty_queue_response.json() == []


def test_pdf_upload_cart_and_admin_download_flow(client, app_module):
    signup(client, username="pdfbuyer")
    buyer_token = login(client, username="pdfbuyer").json()["access_token"]

    pdf_bytes = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
        b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n"
        b"trailer<</Root 1 0 R>>\n%%EOF"
    )

    upload_response = client.post(
        "/api/uploads/pdf",
        data={"total_pages": "60", "quantity": "1"},
        files={"file": ("notes.pdf", pdf_bytes, "application/pdf")},
        headers=auth_headers(buyer_token),
    )
    assert upload_response.status_code == 200
    upload_payload = upload_response.json()
    assert upload_payload["total_pages"] == 60
    assert upload_payload["stored_filename"]
    assert upload_payload["calculated_price"] == 140.0

    add_cart_response = client.post(
        "/cart/items",
        json={
            "item_type": "pdf",
            "upload_id": upload_payload["id"],
            "stored_filename": upload_payload["stored_filename"],
            "total_pages": upload_payload["total_pages"],
            "quantity": 1,
        },
        headers=auth_headers(buyer_token),
    )
    assert add_cart_response.status_code == 200
    cart_payload = add_cart_response.json()
    assert cart_payload["item_type"] == "pdf"
    assert cart_payload["upload_id"] == upload_payload["id"]
    assert cart_payload["item_name"] == "notes.pdf"
    assert cart_payload["total_price"] == 140.0

    cart_response = client.get("/cart", headers=auth_headers(buyer_token))
    assert cart_response.status_code == 200
    cart_items = cart_response.json()["items"]
    assert len(cart_items) == 1
    assert cart_items[0]["upload"]["stored_filename"] == upload_payload["stored_filename"]

    order_response = client.post(
        "/orders",
        json={
            "delivery_type": "hostel",
            "hostel_name": "Himalaya",
            "contact_number": "9876543210",
            "alternate_contact_number": "",
        },
        headers=auth_headers(buyer_token),
    )
    assert order_response.status_code == 200

    create_admin(app_module)
    admin_token = login(client, username="adminuser").json()["access_token"]

    admin_orders_response = client.get("/admin/orders", headers=auth_headers(admin_token))
    assert admin_orders_response.status_code == 200
    admin_orders = admin_orders_response.json()
    assert len(admin_orders) == 1
    assert len(admin_orders[0]["items"]) == 1
    assert admin_orders[0]["items"][0]["stored_filename"] == upload_payload["stored_filename"]
    assert admin_orders[0]["items"][0]["original_filename"] == "notes.pdf"


def test_legacy_plaintext_password_is_upgraded_on_login(client, app_module):
    db = app_module.SessionLocal()
    try:
        user = app_module.models.User(
            username="legacyuser",
            password_hash="legacy-password",
            role="user",
        )
        db.add(user)
        db.commit()
    finally:
        db.close()

    response = login(client, username="legacyuser", password="legacy-password")
    assert response.status_code == 200
    token = response.json()["access_token"]
    assert token

    db = app_module.SessionLocal()
    try:
        refreshed_user = db.query(app_module.models.User).filter_by(username="legacyuser").first()
        assert refreshed_user is not None
        assert refreshed_user.password_hash != "legacy-password"
        assert app_module.is_password_hashed(refreshed_user.password_hash)
    finally:
        db.close()
