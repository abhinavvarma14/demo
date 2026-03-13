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


def signup(client, username="testuser", password="strongpass123"):
    return client.post(
        "/signup",
        json={"username": username, "password": password},
    )


def login(client, username="testuser", password="strongpass123"):
    return client.post(
        "/login",
        data={"username": username, "password": password},
    )


def create_admin(app_module, username="adminuser", password="strongpass123"):
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


def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_signup_rejects_duplicate_username(client):
    first = signup(client)
    second = signup(client)

    assert first.status_code == 200
    assert second.status_code == 400
    assert second.json()["detail"] == "Username already exists"


def test_login_rejects_invalid_credentials(client):
    signup(client)
    response = login(client, password="wrongpass123")

    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect password"


def test_invalid_token_returns_401(client):
    response = client.get("/cart", headers=auth_headers("not-a-real-token"))

    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid authentication"


def test_login_returns_user_not_found_for_missing_user(client):
    response = login(client, username="missing-user")

    assert response.status_code == 401
    assert response.json()["detail"] == "User not found"


def test_non_admin_cannot_access_dashboard(client):
    signup(client)
    token = login(client).json()["access_token"]

    response = client.get("/admin/dashboard", headers=auth_headers(token))

    assert response.status_code == 403
    assert response.json()["detail"] == "Admin access required"


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
