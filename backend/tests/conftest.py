from __future__ import annotations

import os
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection, Engine, make_url
from sqlalchemy.orm import Session

# Tests create and wipe tables, so never let them run against a non-test database.
os.environ.setdefault("POSTGRES_DB", "printing_app_test")

from app.config import settings  # noqa: E402
from app.db import Base, get_db  # noqa: E402
from app import models  # noqa: E402,F401  (registers every table on Base.metadata)
from app.main import app  # noqa: E402

if not settings.postgres_db.endswith("_test"):
    raise RuntimeError(
        f"Refusing to run tests against database {settings.postgres_db!r}; "
        "POSTGRES_DB must end with '_test'."
    )


def _ensure_database_exists(database_url: str) -> None:
    url = make_url(database_url)
    admin_engine = create_engine(url.set(database="postgres"), isolation_level="AUTOCOMMIT")
    with admin_engine.connect() as connection:
        exists = connection.scalar(
            text("SELECT 1 FROM pg_database WHERE datname = :name"),
            {"name": url.database},
        )
        if not exists:
            connection.execute(text(f'CREATE DATABASE "{url.database}"'))
    admin_engine.dispose()


@pytest.fixture(scope="session")
def engine() -> Iterator[Engine]:
    _ensure_database_exists(settings.database_url)
    test_engine = create_engine(settings.database_url, pool_pre_ping=True)
    Base.metadata.drop_all(test_engine)
    Base.metadata.create_all(test_engine)
    yield test_engine
    test_engine.dispose()


@pytest.fixture
def connection(engine: Engine) -> Iterator[Connection]:
    """One outer transaction per test, rolled back afterwards so tests never see each other's data."""
    with engine.connect() as conn:
        transaction = conn.begin()
        yield conn
        transaction.rollback()


def _session(connection: Connection) -> Session:
    # Service code calls commit(); inside the outer transaction that only releases a savepoint.
    return Session(bind=connection, join_transaction_mode="create_savepoint", autoflush=False)


@pytest.fixture
def db(connection: Connection) -> Iterator[Session]:
    session = _session(connection)
    yield session
    session.close()


@pytest.fixture
def client(connection: Connection) -> Iterator[TestClient]:
    def override_get_db() -> Iterator[Session]:
        # A fresh session per request, like production, all on the test's connection.
        session = _session(connection)
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    # Not used as a context manager, so the app lifespan (init_db on the real engine) never runs.
    yield TestClient(app)
    app.dependency_overrides.clear()


class Api:
    """Small helpers for building test data through the public API."""

    def __init__(self, client: TestClient) -> None:
        self.client = client

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = self.client.post(path, json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    def category(self, name: str = "Stickers", parent_id: int | None = None) -> dict[str, Any]:
        return self._post("/categories", {"name": name, "parent_id": parent_id})

    def customer(self, name: str = "Ann", **fields: Any) -> dict[str, Any]:
        return self._post("/customers", {"name": name, **fields})

    def item(
        self,
        category_id: int,
        name: str = "Pen",
        price: str = "10.00",
        cost: str = "4.00",
        **fields: Any,
    ) -> dict[str, Any]:
        payload = {"name": name, "price": price, "cost": cost, "category_id": category_id, **fields}
        return self._post("/items", payload)

    def invoice(
        self,
        customer_id: int,
        lines: list[tuple[int, int]],
        invoice_date: str = "2026-01-15",
    ) -> dict[str, Any]:
        payload = {
            "customer_id": customer_id,
            "invoice_date": invoice_date,
            "items": [{"item_id": item_id, "quantity": quantity} for item_id, quantity in lines],
        }
        return self._post("/invoices", payload)


@pytest.fixture
def api(client: TestClient) -> Api:
    return Api(client)
