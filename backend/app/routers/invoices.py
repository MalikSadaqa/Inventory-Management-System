from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.messages.invoice import InvoiceCreate, InvoiceDetailRead, InvoiceSummaryRead
from app.services.invoices import create_invoice, get_invoice_by_id, list_invoices
from app.utils import BusinessRuleError, NotFoundError


router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.post("", response_model=InvoiceDetailRead, status_code=status.HTTP_201_CREATED)
def create_invoice_endpoint(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
) -> InvoiceDetailRead:
    try:
        invoice = create_invoice(db, payload)
    except NotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except BusinessRuleError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error

    return InvoiceDetailRead.model_validate(invoice)


@router.get("", response_model=list[InvoiceSummaryRead])
def list_invoices_endpoint(db: Session = Depends(get_db)) -> list[InvoiceSummaryRead]:
    invoices = list_invoices(db)
    return [InvoiceSummaryRead.model_validate(invoice) for invoice in invoices]


@router.get("/{invoice_id}", response_model=InvoiceDetailRead)
def get_invoice_endpoint(
    invoice_id: int,
    db: Session = Depends(get_db),
) -> InvoiceDetailRead:
    try:
        invoice = get_invoice_by_id(db, invoice_id)
    except NotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error

    return InvoiceDetailRead.model_validate(invoice)
