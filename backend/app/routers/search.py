from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import get_db
from app.messages.search import InvoiceLineSearchQuery, InvoiceLineSearchResponse
from app.services.search import search_invoice_lines


router = APIRouter(prefix="/search", tags=["search"])


@router.get("/invoice-lines", response_model=InvoiceLineSearchResponse)
def search_invoice_lines_endpoint(
    # Query() validates the whole model with the request, so model validators return 422.
    filters: Annotated[InvoiceLineSearchQuery, Query()],
    db: Session = Depends(get_db),
) -> InvoiceLineSearchResponse:
    try:
        return search_invoice_lines(db, filters)
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to search invoice lines.",
        ) from error
