from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.messages.customer import CustomerCreate, CustomerUpdate
from app.models.customer import Customer


def create_customer(db: Session, payload: CustomerCreate) -> Customer:
    customer = Customer(name=payload.name.strip(), email=payload.email)
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def list_customers(db: Session, search: str | None = None) -> list[Customer]:
    if search:
        return search_customers_by_name(db, search)

    statement = select(Customer).order_by(Customer.name.asc(), Customer.id.asc())
    return list(db.scalars(statement).all())


def search_customers_by_name(db: Session, search: str) -> list[Customer]:
    normalized_search = search.strip()
    statement = (
        select(Customer)
        .where(Customer.name.ilike(f"%{normalized_search}%"))
        .order_by(Customer.name.asc(), Customer.id.asc())
    )
    return list(db.scalars(statement).all())


def get_customer_by_id(db: Session, customer_id: int) -> Customer:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise ValueError("Customer not found.")
    return customer


def update_customer(db: Session, customer_id: int, payload: CustomerUpdate) -> Customer:
    customer = get_customer_by_id(db, customer_id)

    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"] is not None:
        updates["name"] = updates["name"].strip()

    for field, value in updates.items():
        setattr(customer, field, value)

    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer
