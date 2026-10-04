from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.messages.invoice import InvoiceCreate, InvoiceDetailRead, InvoiceSummaryRead
from app.messages.pagination import Page, PageParams
from app.services.invoices import (
    create_invoice,
    get_invoice_by_id,
    get_invoice_excel,
    get_invoice_pdf,
    list_invoices,
)


router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.post("", response_model=InvoiceDetailRead, status_code=status.HTTP_201_CREATED)
def create_invoice_endpoint(
    payload: InvoiceCreate,
    db: Session = Depends(get_db),
) -> InvoiceDetailRead:
    invoice = create_invoice(db, payload)

    return InvoiceDetailRead.model_validate(invoice)


@router.get("", response_model=Page[InvoiceSummaryRead])
def list_invoices_endpoint(
    paging: PageParams = Depends(),
    db: Session = Depends(get_db),
) -> Page[InvoiceSummaryRead]:
    invoices, total = list_invoices(db, page=paging.page, page_size=paging.page_size)
    return Page(
        items=[InvoiceSummaryRead.model_validate(invoice) for invoice in invoices],
        page=paging.page,
        page_size=paging.page_size,
        total=total,
    )


@router.get("/{invoice_id}", response_model=InvoiceDetailRead)
def get_invoice_endpoint(
    invoice_id: int,
    db: Session = Depends(get_db),
) -> InvoiceDetailRead:
    invoice = get_invoice_by_id(db, invoice_id)

    return InvoiceDetailRead.model_validate(invoice)


@router.get("/{invoice_id}/pdf")
def get_invoice_pdf_endpoint(
    invoice_id: int,
    db: Session = Depends(get_db),
) -> Response:
    invoice, pdf_bytes = get_invoice_pdf(db, invoice_id)

    filename = f'{invoice.invoice_number}.pdf'
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/{invoice_id}/pdf/download")
def download_invoice_pdf_endpoint(
    invoice_id: int,
    db: Session = Depends(get_db),
) -> Response:
    invoice, pdf_bytes = get_invoice_pdf(db, invoice_id)

    filename = f'{invoice.invoice_number}.pdf'
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{invoice_id}/excel")
def export_invoice_excel_endpoint(
    invoice_id: int,
    db: Session = Depends(get_db),
) -> Response:
    invoice, excel_bytes = get_invoice_excel(db, invoice_id)

    filename = f'{invoice.invoice_number}.xlsx'
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
