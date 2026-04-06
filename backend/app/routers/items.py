from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.messages.item import ItemCreate, ItemDetail, ItemListItem, ItemUpdate
from app.services.items import build_item_detail, create_item, get_item_by_id, list_items, update_item
from app.utils import BusinessRuleError, NotFoundError


router = APIRouter(prefix="/items", tags=["items"])


@router.post("", response_model=ItemListItem, status_code=status.HTTP_201_CREATED)
def create_item_endpoint(
    payload: ItemCreate,
    db: Session = Depends(get_db),
) -> ItemListItem:
    try:
        item = create_item(db, payload)
    except BusinessRuleError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    return ItemListItem.model_validate(item)


@router.get("", response_model=list[ItemListItem])
def list_items_endpoint(
    search: str | None = Query(default=None, max_length=255),
    category_id: int | None = Query(default=None, ge=1),
    db: Session = Depends(get_db),
) -> list[ItemListItem]:
    items = list_items(db, search=search, category_id=category_id)
    return [ItemListItem.model_validate(item) for item in items]


@router.get("/{item_id}", response_model=ItemDetail)
def get_item_endpoint(item_id: int, db: Session = Depends(get_db)) -> ItemDetail:
    try:
        item = get_item_by_id(db, item_id)
    except NotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    return build_item_detail(item)


@router.patch("/{item_id}", response_model=ItemListItem)
def update_item_endpoint(
    item_id: int,
    payload: ItemUpdate,
    db: Session = Depends(get_db),
) -> ItemListItem:
    try:
        item = update_item(db, item_id, payload)
    except NotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except BusinessRuleError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    return ItemListItem.model_validate(item)
