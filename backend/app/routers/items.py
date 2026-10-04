from __future__ import annotations

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.messages.item import ItemCreate, ItemDetail, ItemListItem, ItemUpdate
from app.messages.pagination import Page, PageParams
from app.services.items import (
    build_item_detail,
    create_item,
    delete_item,
    get_item_by_id,
    list_items,
    update_item,
)


router = APIRouter(prefix="/items", tags=["items"])


@router.post("", response_model=ItemListItem, status_code=status.HTTP_201_CREATED)
def create_item_endpoint(
    payload: ItemCreate,
    db: Session = Depends(get_db),
) -> ItemListItem:
    item = create_item(db, payload)

    return ItemListItem.model_validate(item)


@router.get("", response_model=Page[ItemListItem])
def list_items_endpoint(
    search: str | None = Query(default=None, max_length=255),
    category_id: int | None = Query(default=None, ge=1),
    paging: PageParams = Depends(),
    db: Session = Depends(get_db),
) -> Page[ItemListItem]:
    items, total = list_items(
        db,
        search=search,
        category_id=category_id,
        page=paging.page,
        page_size=paging.page_size,
    )
    return Page(
        items=[ItemListItem.model_validate(item) for item in items],
        page=paging.page,
        page_size=paging.page_size,
        total=total,
    )


@router.get("/{item_id}", response_model=ItemDetail)
def get_item_endpoint(item_id: int, db: Session = Depends(get_db)) -> ItemDetail:
    item = get_item_by_id(db, item_id)

    return build_item_detail(item)


@router.patch("/{item_id}", response_model=ItemListItem)
def update_item_endpoint(
    item_id: int,
    payload: ItemUpdate,
    db: Session = Depends(get_db),
) -> ItemListItem:
    item = update_item(db, item_id, payload)

    return ItemListItem.model_validate(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item_endpoint(item_id: int, db: Session = Depends(get_db)) -> Response:
    delete_item(db, item_id)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
