from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.messages.invoice import InvoiceCreate
from app.models.customer import Customer
from app.models.invoice import Invoice, InvoiceLine
from app.models.item import Item
from app.services.pdf import render_invoice_pdf
from app.utils import BusinessRuleError, NotFoundError

from openpyxl import Workbook
from openpyxl.styles import Font


TAX_RATE = Decimal("0.16")
MONEY_QUANTIZER = Decimal("0.01")


def create_invoice(db: Session, payload: InvoiceCreate) -> Invoice:
    customer = db.get(Customer, payload.customer_id)
    if customer is None:
        raise NotFoundError("Customer not found.")

    item_ids = [line.item_id for line in payload.items]
    statement = (
        select(Item)
        .options(selectinload(Item.category))
        .where(Item.id.in_(item_ids))
        .order_by(Item.id.asc())
    )
    items = list(db.scalars(statement).all())
    items_by_id = {item.id: item for item in items}

    missing_item_ids = sorted({item_id for item_id in item_ids if item_id not in items_by_id})
    if missing_item_ids:
        missing_ids = ", ".join(str(item_id) for item_id in missing_item_ids)
        raise NotFoundError(f"Item not found: {missing_ids}.")

    total_quantity = sum(line.quantity for line in payload.items)
    invoice_lines: list[InvoiceLine] = []
    subtotal = Decimal("0.00")

    for requested_line in payload.items:
        item = items_by_id[requested_line.item_id]
        unit_price = _to_money(item.price)
        line_subtotal = _to_money(unit_price * requested_line.quantity)
        subtotal += line_subtotal

        category_path = None
        if item.category is not None:
            category_path = " / ".join(_build_category_path(item.category))

        invoice_lines.append(
            InvoiceLine(
                item_id=item.id,
                item_name_snapshot=item.name,
                unit_price_snapshot=unit_price,
                unit_cost_snapshot=_to_money(item.cost),
                category_id_snapshot=item.category_id,
                category_path_snapshot=category_path,
                quantity=requested_line.quantity,
                line_subtotal=line_subtotal,
            )
        )

    subtotal = _to_money(subtotal)
    tax_amount = _to_money(subtotal * TAX_RATE)
    total = _to_money(subtotal + tax_amount)

    last_error: IntegrityError | None = None
    for _ in range(3):
        invoice = Invoice(
            invoice_number=_generate_invoice_number(db),
            customer_id=customer.id,
            invoice_date=payload.invoice_date,
            total_quantity=total_quantity,
            subtotal=subtotal,
            tax_rate=TAX_RATE,
            tax_amount=tax_amount,
            total=total,
            lines=[
                InvoiceLine(
                    item_id=line.item_id,
                    item_name_snapshot=line.item_name_snapshot,
                    unit_price_snapshot=line.unit_price_snapshot,
                    unit_cost_snapshot=line.unit_cost_snapshot,
                    category_id_snapshot=line.category_id_snapshot,
                    category_path_snapshot=line.category_path_snapshot,
                    quantity=line.quantity,
                    line_subtotal=line.line_subtotal,
                )
                for line in invoice_lines
            ],
        )

        try:
            db.add(invoice)
            db.commit()
            return get_invoice_by_id(db, invoice.id)
        except IntegrityError as error:
            db.rollback()
            last_error = error

    raise BusinessRuleError("Failed to generate a unique invoice number.") from last_error


def list_invoices(db: Session) -> list[Invoice]:
    statement = (
        select(Invoice)
        .options(selectinload(Invoice.customer))
        .order_by(Invoice.invoice_date.desc(), Invoice.id.desc())
    )
    return list(db.scalars(statement).all())


def get_invoice_by_id(db: Session, invoice_id: int) -> Invoice:
    statement = (
        select(Invoice)
        .options(selectinload(Invoice.customer), selectinload(Invoice.lines))
        .where(Invoice.id == invoice_id)
    )
    invoice = db.scalar(statement)
    if invoice is None:
        raise NotFoundError("Invoice not found.")
    return invoice


def get_invoice_pdf(db: Session, invoice_id: int) -> tuple[Invoice, bytes]:
    invoice = get_invoice_by_id(db, invoice_id)
    return invoice, render_invoice_pdf(invoice)


def get_invoice_excel(db: Session, invoice_id: int) -> tuple[Invoice, bytes]:
    invoice = get_invoice_by_id(db, invoice_id)
    workbook = Workbook()
    metadata_sheet = workbook.active
    metadata_sheet.title = "Invoice"
    lines_sheet = workbook.create_sheet("Line Items")

    metadata_rows = [
        ("Invoice Number", invoice.invoice_number),
        ("Invoice Date", invoice.invoice_date.isoformat()),
        ("Customer Name", invoice.customer.name),
        ("Customer Email", invoice.customer.email or ""),
        ("Customer Phone", invoice.customer.phone or ""),
        ("Total Quantity", invoice.total_quantity),
        ("Subtotal", str(invoice.subtotal)),
        ("Tax Rate", str(invoice.tax_rate)),
        ("Tax Amount", str(invoice.tax_amount)),
        ("Total", str(invoice.total)),
        ("Created At", invoice.created_at.isoformat()),
        ("Updated At", invoice.updated_at.isoformat()),
    ]

    metadata_sheet.append(["Field", "Value"])
    _style_header_row(metadata_sheet)
    for row in metadata_rows:
        metadata_sheet.append(list(row))

    lines_sheet.append(
        [
            "Item Snapshot",
            "Item ID",
            "Category Snapshot",
            "Quantity",
            "Unit Price Snapshot",
            "Line Subtotal",
        ]
    )
    _style_header_row(lines_sheet)

    for line in invoice.lines:
        lines_sheet.append(
            [
                line.item_name_snapshot,
                line.item_id or "",
                line.category_path_snapshot or "",
                line.quantity,
                str(line.unit_price_snapshot),
                str(line.line_subtotal),
            ]
        )

    for sheet in (metadata_sheet, lines_sheet):
        _auto_size_columns(sheet)

    output = BytesIO()
    workbook.save(output)
    return invoice, output.getvalue()


def _generate_invoice_number(db: Session) -> str:
    next_id = (db.scalar(select(func.max(Invoice.id))) or 0) + 1
    return f"INV-{next_id:06d}"


def _to_money(value: Decimal | int) -> Decimal:
    amount = value if isinstance(value, Decimal) else Decimal(value)
    return amount.quantize(MONEY_QUANTIZER, rounding=ROUND_HALF_UP)


def _build_category_path(category) -> list[str]:
    path: list[str] = []
    current = category
    while current is not None:
        path.append(current.name)
        current = current.parent

    path.reverse()
    return path


def _style_header_row(sheet) -> None:
    for cell in sheet[1]:
        cell.font = Font(bold=True)


def _auto_size_columns(sheet) -> None:
    for column_cells in sheet.columns:
        max_length = max(len(str(cell.value or "")) for cell in column_cells)
        sheet.column_dimensions[column_cells[0].column_letter].width = min(max(max_length + 2, 12), 40)
