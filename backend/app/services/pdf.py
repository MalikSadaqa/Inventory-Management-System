from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from jinja2 import Environment, FileSystemLoader, select_autoescape
from weasyprint import HTML

from app.models.invoice import Invoice


TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"

jinja_env = Environment(
    loader=FileSystemLoader(TEMPLATE_DIR),
    autoescape=select_autoescape(["html", "xml"]),
)


def render_invoice_pdf(invoice: Invoice) -> bytes:
    template = jinja_env.get_template("invoice.html")
    html = template.render(_build_invoice_context(invoice))
    return HTML(string=html, base_url=str(TEMPLATE_DIR)).write_pdf()


def _build_invoice_context(invoice: Invoice) -> dict[str, Any]:
    return {
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"),
        "invoice": {
            "invoice_number": invoice.invoice_number,
            "invoice_date": invoice.invoice_date.strftime("%b %d, %Y"),
            "total_quantity": invoice.total_quantity,
            "subtotal": _money(invoice.subtotal),
            "tax_rate": _percent(invoice.tax_rate),
            "tax_amount": _money(invoice.tax_amount),
            "total": _money(invoice.total),
            "customer": {
                "name": invoice.customer.name,
                "email": invoice.customer.email or "No email",
                "phone": invoice.customer.phone,
            },
            "lines": [
                {
                    "item_name_snapshot": line.item_name_snapshot,
                    "category_path_snapshot": line.category_path_snapshot or "Uncategorized",
                    "quantity": line.quantity,
                    "unit_price_snapshot": _money(line.unit_price_snapshot),
                    "line_subtotal": _money(line.line_subtotal),
                }
                for line in invoice.lines
            ],
        },
    }


def _money(value: Any) -> str:
    return f"{value:.2f}"


def _percent(value: Any) -> str:
    return f"{float(value) * 100:.2f}%"
