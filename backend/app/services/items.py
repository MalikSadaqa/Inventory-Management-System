from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.messages.item import ItemCreate, ItemDetail, ItemUpdate
from app.models.invoice import InvoiceLine
from app.models.category import Category
from app.models.customer import Customer
from app.models.invoice import Invoice
from app.models.item import Item
from app.utils import BusinessRuleError, NotFoundError


def create_item(db: Session, payload: ItemCreate) -> Item:
    category = _get_leaf_category(db, payload.category_id)
    tagged_customers = _get_tagged_customers(db, payload.tagged_customer_ids)
    item = Item(
        name=payload.name,
        price=payload.price,
        cost=payload.cost,
        category_id=category.id,
        details=payload.details,
        tagged_customers=tagged_customers,
    )
    db.add(item)
    db.commit()
    return get_item_by_id(db, item.id)


def list_items(
    db: Session,
    search: str | None = None,
    category_id: int | None = None,
) -> list[Item]:
    statement = _base_items_statement()

    if search and search.strip():
        statement = statement.where(Item.name.ilike(f"%{search.strip()}%"))

    if category_id is not None:
        statement = statement.where(Item.category_id == category_id)

    statement = statement.order_by(Item.name.asc(), Item.id.asc())
    return list(db.scalars(statement).all())


def search_items(db: Session, search: str) -> list[Item]:
    return list_items(db, search=search)


def get_item_by_id(db: Session, item_id: int) -> Item:
    statement = _base_items_statement().where(Item.id == item_id)
    item = db.scalar(statement)
    if item is None:
        raise NotFoundError("Item not found.")
    return item


def update_item(db: Session, item_id: int, payload: ItemUpdate) -> Item:
    item = get_item_by_id(db, item_id)
    updates = payload.model_dump(exclude_unset=True)

    if "category_id" in updates and updates["category_id"] is not None:
        category = _get_leaf_category(db, updates["category_id"])
        updates["category_id"] = category.id

    tagged_customer_ids = updates.pop("tagged_customer_ids", None)
    if tagged_customer_ids is not None:
        item.tagged_customers = _get_tagged_customers(db, tagged_customer_ids)

    for field, value in updates.items():
        setattr(item, field, value)

    db.add(item)
    db.commit()

    return get_item_by_id(db, item_id)


def delete_item(db: Session, item_id: int) -> None:
    item = get_item_by_id(db, item_id)

    is_used_in_invoices = db.scalar(select(InvoiceLine.id).where(InvoiceLine.item_id == item_id).limit(1))
    if is_used_in_invoices is not None:
        raise BusinessRuleError("Cannot delete an item that is already used in invoices.")

    db.delete(item)
    db.commit()


def build_item_detail(item: Item) -> ItemDetail:
    if item.category is None:
        raise BusinessRuleError("Item category data is missing.")

    category_path = _build_category_path(item.category)
    return ItemDetail(
        id=item.id,
        name=item.name,
        price=item.price,
        cost=item.cost,
        details=item.details,
        category={"id": item.category.id, "name": item.category.name},
        category_path=category_path,
        tagged_customers=[
            {
                "id": customer.id,
                "name": customer.name,
                "email": customer.email,
            }
            for customer in item.tagged_customers
        ],
        invoice_appearances=_build_invoice_appearances(item),
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _base_items_statement():
    return select(Item).options(
        selectinload(Item.category),
        selectinload(Item.tagged_customers),
        selectinload(Item.invoice_lines).selectinload(InvoiceLine.invoice),
    )


def _get_tagged_customers(db: Session, customer_ids: list[int]) -> list[Customer]:
    if not customer_ids:
        return []

    customers = list(
        db.scalars(
            select(Customer)
            .where(Customer.id.in_(customer_ids))
            .order_by(Customer.name.asc(), Customer.id.asc())
        ).all()
    )
    customers_by_id = {customer.id: customer for customer in customers}
    missing_customer_ids = [customer_id for customer_id in customer_ids if customer_id not in customers_by_id]
    if missing_customer_ids:
        missing_ids = ", ".join(str(customer_id) for customer_id in missing_customer_ids)
        raise BusinessRuleError(f"Customer not found: {missing_ids}.")

    return [customers_by_id[customer_id] for customer_id in customer_ids]


def _get_leaf_category(db: Session, category_id: int) -> Category:
    category = db.get(Category, category_id)
    if category is None:
        raise BusinessRuleError("Category not found.")

    has_children = db.scalar(select(Category.id).where(Category.parent_id == category_id).limit(1))
    if has_children is not None:
        raise BusinessRuleError("Items can only be assigned to leaf categories.")

    return category


def _build_category_path(category: Category) -> list[str]:
    path: list[str] = []
    current: Category | None = category
    while current is not None:
        path.append(current.name)
        current = current.parent

    path.reverse()
    return path


def _build_invoice_appearances(item: Item) -> list[dict]:
    appearances = []
    for line in item.invoice_lines:
        if line.invoice is None:
            continue

        invoice: Invoice = line.invoice
        appearances.append(
            {
                "invoice_id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "invoice_date": invoice.invoice_date,
                "quantity": line.quantity,
                "unit_price": line.unit_price_snapshot,
                "line_total": line.line_subtotal,
            }
        )

    appearances.sort(
        key=lambda appearance: (
            appearance["invoice_date"],
            appearance["invoice_number"],
            appearance["invoice_id"],
        ),
        reverse=True,
    )
    return appearances
