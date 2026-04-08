from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.messages.category import CategoryCreate, CategoryDetailRead, CategoryTreeNode, CategoryUpdate
from app.models.category import Category
from app.models.item import Item
from app.utils import BusinessRuleError, NotFoundError


def create_category(db: Session, payload: CategoryCreate) -> Category:
    category = Category(name=payload.name, parent_id=payload.parent_id)
    _validate_parent_assignment(db, category.id, payload.parent_id)

    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def list_categories(db: Session, search: str | None = None) -> list[Category]:
    statement = select(Category)

    if search:
        statement = statement.where(Category.name.ilike(f"%{search.strip()}%"))

    statement = statement.order_by(Category.name.asc(), Category.id.asc())
    return list(db.scalars(statement).all())


def get_category_by_id(db: Session, category_id: int) -> Category:
    statement = (
        select(Category)
        .options(selectinload(Category.children), selectinload(Category.parent))
        .where(Category.id == category_id)
    )
    category = db.scalar(statement)
    if category is None:
        raise NotFoundError("Category not found.")
    return category


def update_category(db: Session, category_id: int, payload: CategoryUpdate) -> Category:
    category = get_category_by_id(db, category_id)
    updates = payload.model_dump(exclude_unset=True)

    if "parent_id" in updates:
        _validate_parent_assignment(db, category_id, updates["parent_id"])

    for field, value in updates.items():
        setattr(category, field, value)

    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int) -> None:
    category = get_category_by_id(db, category_id)

    has_children = db.scalar(select(Category.id).where(Category.parent_id == category_id).limit(1))
    if has_children is not None:
        raise BusinessRuleError("Cannot delete a category that has child categories.")

    is_used_by_items = db.scalar(select(Item.id).where(Item.category_id == category_id).limit(1))
    if is_used_by_items is not None:
        raise BusinessRuleError("Cannot delete a category that is assigned to items.")

    db.delete(category)
    db.commit()


def get_category_tree(db: Session) -> list[CategoryTreeNode]:
    statement = (
        select(Category)
        .options(selectinload(Category.children))
        .order_by(Category.name.asc(), Category.id.asc())
    )
    categories = list(db.scalars(statement).all())

    nodes_by_id = {
        category.id: CategoryTreeNode(
            id=category.id,
            name=category.name,
            parent_id=category.parent_id,
            children=[],
            is_leaf=True,
        )
        for category in categories
    }

    roots: list[CategoryTreeNode] = []
    for category in categories:
        node = nodes_by_id[category.id]
        if category.parent_id is None:
            roots.append(node)
            continue

        parent_node = nodes_by_id.get(category.parent_id)
        if parent_node is not None:
            parent_node.children.append(node)
            parent_node.is_leaf = False

    _sort_tree_nodes(roots)
    return roots


def build_category_detail(db: Session, category_id: int) -> CategoryDetailRead:
    category = get_category_by_id(db, category_id)
    full_tree = get_category_tree(db)
    selected_node = _find_tree_node(full_tree, category.id)
    children_tree = selected_node.children if selected_node is not None else []
    path = _build_category_path(category)

    return CategoryDetailRead(
        id=category.id,
        name=category.name,
        parent_id=category.parent_id,
        created_at=category.created_at,
        updated_at=category.updated_at,
        parent=(
            {"id": category.parent.id, "name": category.parent.name}
            if category.parent is not None
            else None
        ),
        path=path,
        children_tree=children_tree,
        is_leaf=selected_node.is_leaf if selected_node is not None else len(category.children) == 0,
    )


def _sort_tree_nodes(nodes: list[CategoryTreeNode]) -> None:
    nodes.sort(key=lambda node: (node.name.lower(), node.id))
    for node in nodes:
        _sort_tree_nodes(node.children)


def _find_tree_node(nodes: list[CategoryTreeNode], category_id: int) -> CategoryTreeNode | None:
    for node in nodes:
        if node.id == category_id:
            return node
        nested = _find_tree_node(node.children, category_id)
        if nested is not None:
            return nested
    return None


def _build_category_path(category: Category) -> list[str]:
    path: list[str] = []
    current: Category | None = category
    while current is not None:
        path.append(current.name)
        current = current.parent

    path.reverse()
    return path


def _validate_parent_assignment(
    db: Session,
    category_id: int | None,
    parent_id: int | None,
) -> None:
    if parent_id is None:
        return

    if category_id is not None and category_id == parent_id:
        raise BusinessRuleError("A category cannot be its own parent.")

    parent = db.get(Category, parent_id)
    if parent is None:
        raise BusinessRuleError("Parent category not found.")

    if category_id is not None:
        current_parent = parent
        while current_parent is not None:
            if current_parent.id == category_id:
                raise BusinessRuleError("Category parent assignment would create a cycle.")
            if current_parent.parent_id is None:
                break
            current_parent = db.get(Category, current_parent.parent_id)
