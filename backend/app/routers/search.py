from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import get_db
from app.messages.search import InvoiceLineSearchQuery, InvoiceLineSearchResponse
from app.services.search import search_invoice_lines


router = APIRouter(prefix="/search", tags=["search"])


@router.get("/invoice-lines", response_model=InvoiceLineSearchResponse)
def search_invoice_lines_endpoint(
    filters: InvoiceLineSearchQuery = Depends(),
    db: Session = Depends(get_db),
) -> InvoiceLineSearchResponse:
    try:
        return search_invoice_lines(db, filters)
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search invoice lines.",
        ) from error
