from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
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
    delete_customer,
    get_customer_by_id,
    list_customers,
    list_customer_invoices,
    update_customer,
)
from app.utils import BusinessRuleError, NotFoundError


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
    except NotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    invoices = list_customer_invoices(db, customer_id)
    return CustomerDetail(
        id=customer.id,
        name=customer.name,
        email=customer.email,
        phone=customer.phone,
        created_at=customer.created_at,
        updated_at=customer.updated_at,
        invoices=[
            {
                "id": invoice.id,
                "invoice_number": invoice.invoice_number,
                "invoice_date": invoice.invoice_date,
                "total": invoice.total,
            }
            for invoice in invoices
        ],
    )


@router.patch("/{customer_id}", response_model=CustomerListItem)
def update_customer_endpoint(
    customer_id: int,
    payload: CustomerUpdate,
    db: Session = Depends(get_db),
) -> CustomerListItem:
    try:
        customer = update_customer(db, customer_id, payload)
    except NotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    return CustomerListItem.model_validate(customer)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer_endpoint(customer_id: int, db: Session = Depends(get_db)) -> Response:
    try:
        delete_customer(db, customer_id)
    except NotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except BusinessRuleError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error

    return Response(status_code=status.HTTP_204_NO_CONTENT)
