from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.messages.category import (
    CategoryCreate,
    CategoryDetailRead,
    CategoryListItem,
    CategoryRead,
    CategoryTreeNode,
    CategoryUpdate,
)
from app.services.categories import (
    build_category_detail,
    create_category,
    delete_category,
    get_category_by_id,
    get_category_tree,
    list_categories,
    update_category,
)


router = APIRouter(prefix="/categories", tags=["categories"])


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category_endpoint(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
) -> CategoryRead:
    category = create_category(db, payload)

    return CategoryRead.model_validate(category)

@router.get("", response_model=list[CategoryListItem])
def list_categories_endpoint(
    search: str | None = Query(default=None, max_length=255),
    db: Session = Depends(get_db),
) -> list[CategoryListItem]:
    categories = list_categories(db, search=search)
    return [CategoryListItem.model_validate(category) for category in categories]


@router.get("/tree", response_model=list[CategoryTreeNode])
def get_category_tree_endpoint(db: Session = Depends(get_db)) -> list[CategoryTreeNode]:
    return get_category_tree(db)


@router.get("/{category_id}", response_model=CategoryDetailRead)
def get_category_endpoint(category_id: int, db: Session = Depends(get_db)) -> CategoryDetailRead:
    return build_category_detail(db, category_id)


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category_endpoint(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
) -> CategoryRead:
    category = update_category(db, category_id, payload)

    return CategoryRead.model_validate(category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category_endpoint(category_id: int, db: Session = Depends(get_db)) -> Response:
    delete_category(db, category_id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
