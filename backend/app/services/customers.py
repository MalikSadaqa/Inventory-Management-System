from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.messages.customer import CustomerCreate, CustomerUpdate
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.item import Item
from app.utils import BusinessRuleError, NotFoundError


def create_customer(db: Session, payload: CustomerCreate) -> Customer:
    customer = Customer(name=payload.name.strip(), email=payload.email, phone=payload.phone)
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
    statement = (
        select(Customer)
        .options(selectinload(Customer.invoices), selectinload(Customer.tagged_items))
        .where(Customer.id == customer_id)
    )
    customer = db.scalar(statement)
    if customer is None:
        raise NotFoundError("Customer not found.")
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


def delete_customer(db: Session, customer_id: int) -> None:
    customer = get_customer_by_id(db, customer_id)

    is_used_in_invoices = db.scalar(
        select(Invoice.id).where(Invoice.customer_id == customer_id).limit(1)
    )
    if is_used_in_invoices is not None:
        raise BusinessRuleError("Cannot delete customer because it is referenced by invoices.")

    is_used_in_item_tags = db.scalar(
        select(Item.id)
        .join(Item.tagged_customers)
        .where(Customer.id == customer_id)
        .limit(1)
    )
    if is_used_in_item_tags is not None:
        raise BusinessRuleError("Cannot delete customer because it is tagged on items.")

    db.delete(customer)
    db.commit()


def list_customer_invoices(db: Session, customer_id: int) -> list[Invoice]:
    statement = (
        select(Invoice)
        .where(Invoice.customer_id == customer_id)
        .order_by(Invoice.invoice_date.desc(), Invoice.id.desc())
    )
    return list(db.scalars(statement).all())


def list_customer_tagged_items(customer: Customer) -> list[Item]:
    return sorted(customer.tagged_items, key=lambda item: (item.name.lower(), item.id))
