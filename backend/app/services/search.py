from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.messages.search import (
    InvoiceLineSearchQuery,
    InvoiceLineSearchResponse,
    InvoiceLineSearchRow,
    InvoiceLineSearchSortField,
    SortDirection,
)
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceLine


def search_invoice_lines(db: Session, filters: InvoiceLineSearchQuery) -> InvoiceLineSearchResponse:
    base_statement = (
        select(
            InvoiceLine.id.label("invoice_line_id"),
            InvoiceLine.item_id.label("item_id"),
            InvoiceLine.item_name_snapshot.label("item_name"),
            Invoice.id.label("invoice_id"),
            Invoice.invoice_number.label("invoice_number"),
            Invoice.invoice_date.label("invoice_date"),
            Customer.id.label("customer_id"),
            Customer.name.label("customer_name"),
            Customer.email.label("customer_email"),
            InvoiceLine.quantity.label("quantity"),
            InvoiceLine.unit_price_snapshot.label("unit_price"),
            InvoiceLine.line_subtotal.label("line_total"),
        )
        .select_from(InvoiceLine)
        .join(Invoice, Invoice.id == InvoiceLine.invoice_id)
        .join(Customer, Customer.id == Invoice.customer_id)
    )

    statement = _apply_filters(base_statement, filters)
    total = db.scalar(select(func.count()).select_from(statement.subquery())) or 0

    offset = (filters.page - 1) * filters.page_size
    rows = db.execute(
        statement
        .order_by(*_build_order_by(filters))
        .offset(offset)
        .limit(filters.page_size)
    ).all()

    return InvoiceLineSearchResponse(
        items=[InvoiceLineSearchRow.model_validate(row._mapping) for row in rows],
        page=filters.page,
        page_size=filters.page_size,
        total=total,
    )


def _apply_filters(statement, filters: InvoiceLineSearchQuery):
    if filters.item_id is not None:
        statement = statement.where(InvoiceLine.item_id == filters.item_id)

    if filters.item_name:
        statement = statement.where(InvoiceLine.item_name_snapshot.ilike(f"%{filters.item_name}%"))

    if filters.customer_name:
        statement = statement.where(Customer.name.ilike(f"%{filters.customer_name}%"))

    if filters.customer_email:
        statement = statement.where(Customer.email.ilike(f"%{filters.customer_email}%"))

    if filters.date_from:
        statement = statement.where(Invoice.invoice_date >= filters.date_from)

    if filters.date_to:
        statement = statement.where(Invoice.invoice_date <= filters.date_to)

    return statement


def _build_order_by(filters: InvoiceLineSearchQuery) -> list:
    sort_column = {
        InvoiceLineSearchSortField.invoice_number: Invoice.invoice_number,
        InvoiceLineSearchSortField.invoice_date: Invoice.invoice_date,
        InvoiceLineSearchSortField.customer_name: Customer.name,
        InvoiceLineSearchSortField.item_name: InvoiceLine.item_name_snapshot,
        InvoiceLineSearchSortField.quantity: InvoiceLine.quantity,
        InvoiceLineSearchSortField.unit_price: InvoiceLine.unit_price_snapshot,
        InvoiceLineSearchSortField.line_total: InvoiceLine.line_subtotal,
    }[filters.sort_by]

    ordered_column = sort_column.asc() if filters.sort_direction == SortDirection.asc else sort_column.desc()

    if filters.sort_by == InvoiceLineSearchSortField.invoice_date:
        secondary_invoice_date = None
    else:
        secondary_invoice_date = Invoice.invoice_date.desc()

    order_by = [ordered_column]
    if secondary_invoice_date is not None:
        order_by.append(secondary_invoice_date)

    order_by.extend(
        [
            Invoice.invoice_number.desc(),
            InvoiceLine.id.desc(),
        ]
    )
    return order_by
