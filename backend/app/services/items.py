from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.messages.item import ItemCreate, ItemDetail, ItemUpdate
from app.models.invoice import InvoiceLine
from app.models.category import Category
from app.models.item import Item
from app.utils import BusinessRuleError, NotFoundError


def create_item(db: Session, payload: ItemCreate) -> Item:
    category = _get_leaf_category(db, payload.category_id)
    item = Item(
        name=payload.name,
        price=payload.price,
        cost=payload.cost,
        category_id=category.id,
        details=payload.details,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


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
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def _base_items_statement():
    return select(Item).options(selectinload(Item.category))


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
