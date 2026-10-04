from __future__ import annotations

from typing import Any

from sqlalchemy import Select, create_engine, func, inspect, select, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.engine import Engine

from app.config import settings


class Base(DeclarativeBase):
    pass


engine: Engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def paginate(db: Session, statement: Select, page: int, page_size: int) -> tuple[list[Any], int]:
    total = db.scalar(select(func.count()).select_from(statement.order_by(None).subquery())) or 0
    rows = db.scalars(statement.offset((page - 1) * page_size).limit(page_size)).all()
    return list(rows), total


def init_db() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _ensure_customer_phone_column()


def check_database_connection() -> bool:
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return True


def _ensure_customer_phone_column() -> None:
    inspector = inspect(engine)
    if "customers" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("customers")}
    if "phone" in existing_columns:
        return

    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE customers ADD COLUMN phone VARCHAR(50)"))
