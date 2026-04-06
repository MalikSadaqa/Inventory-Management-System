from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.messages.category import (
    CategoryCreate,
    CategoryListItem,
    CategoryRead,
    CategoryTreeNode,
    CategoryUpdate,
)
from app.services.categories import (
    create_category,
    delete_category,
    get_category_by_id,
    get_category_tree,
    list_categories,
    update_category,
)
from app.utils import BusinessRuleError, NotFoundError


router = APIRouter(prefix="/categories", tags=["categories"])


@router.post("", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category_endpoint(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
) -> CategoryRead:
    try:
        category = create_category(db, payload)
    except BusinessRuleError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    return CategoryRead.model_validate(category)


@router.get("", response_model=list[CategoryListItem])
def list_categories_endpoint(db: Session = Depends(get_db)) -> list[CategoryListItem]:
    categories = list_categories(db)
    return [CategoryListItem.model_validate(category) for category in categories]


@router.get("/tree", response_model=list[CategoryTreeNode])
def get_category_tree_endpoint(db: Session = Depends(get_db)) -> list[CategoryTreeNode]:
    return get_category_tree(db)


@router.get("/{category_id}", response_model=CategoryRead)
def get_category_endpoint(category_id: int, db: Session = Depends(get_db)) -> CategoryRead:
    try:
        category = get_category_by_id(db, category_id)
    except NotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    return CategoryRead.model_validate(category)


@router.patch("/{category_id}", response_model=CategoryRead)
def update_category_endpoint(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
) -> CategoryRead:
    try:
        category = update_category(db, category_id, payload)
    except NotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except BusinessRuleError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    return CategoryRead.model_validate(category)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category_endpoint(category_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        delete_category(db, category_id)
    except NotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except BusinessRuleError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error

    return Response(status_code=status.HTTP_204_NO_CONTENT)
