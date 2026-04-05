from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.messages.customer import (
    CustomerCreate,
    CustomerDetail,
    CustomerListItem,
    CustomerUpdate,
)
from app.services.customers import (
    create_customer,
    get_customer_by_id,
    list_customers,
    update_customer,
)


router = APIRouter(prefix="/customers", tags=["customers"])


@router.post("", response_model=CustomerListItem, status_code=status.HTTP_201_CREATED)
def create_customer_endpoint(
    payload: CustomerCreate,
    db: Session = Depends(get_db),
) -> CustomerListItem:
    customer = create_customer(db, payload)
    return CustomerListItem.model_validate(customer)


@router.get("", response_model=list[CustomerListItem])
def list_customers_endpoint(
    search: str | None = Query(default=None, max_length=255),
    db: Session = Depends(get_db),
) -> list[CustomerListItem]:
    customers = list_customers(db, search=search)
    return [CustomerListItem.model_validate(customer) for customer in customers]


@router.get("/{customer_id}", response_model=CustomerDetail)
def get_customer_endpoint(
    customer_id: int,
    db: Session = Depends(get_db),
) -> CustomerDetail:
    try:
        customer = get_customer_by_id(db, customer_id)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    detail = CustomerDetail.model_validate(customer)
    return detail.model_copy(update={"invoices": []})


@router.patch("/{customer_id}", response_model=CustomerListItem)
def update_customer_endpoint(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
) -> CustomerListItem:
    try:
        customer = update_customer(db, customer_id, payload)
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    return CustomerListItem.model_validate(customer)
