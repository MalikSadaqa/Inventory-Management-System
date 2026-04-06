## Run With Docker

1. `docker compose up --build`
2. Frontend: `http://localhost:5173`
3. Backend health: `http://localhost:8000/health`

## Run Locally

1. Start PostgreSQL: `docker compose up -d postgres`
2. Backend:
   `cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && cp .env.example .env && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
3. Frontend:
   `cd frontend && cp .env.example .env && npm install && npm run dev`

## Included Features

- Customers with name, email, and optional phone
- Customer detail with invoice history
- Categories CRUD with detail page, path, and child tree
- Items CRUD with safe delete protection when invoices reference an item
- Invoices with immutable item snapshots
- Invoice PDF rendering with WeasyPrint
- Inline invoice PDF viewing, PDF download, browser print flow, and Excel export
- Improved invoice line editing with bottom-positioned `Add Line`

## Invoice Document Endpoints

- `GET /invoices/{invoice_id}/pdf` returns inline PDF
- `GET /invoices/{invoice_id}/pdf/download` returns attachment PDF
- `GET /invoices/{invoice_id}/excel` returns invoice XLSX export

## Manual Test Flow

1. Open `http://localhost:5173/invoices`.
2. Create an invoice with multiple line items and confirm the main `Add Line` action is at the bottom of the line items section.
3. Open the created invoice detail page.
4. Click `View PDF` and confirm the PDF renders inline on the page without downloading.
5. Click `Download PDF` and confirm a file named like `INV-000001.pdf` downloads.
6. Click `Print PDF` and confirm the browser opens the PDF print flow.
7. Click `Export Excel` and confirm a file named like `INV-000001.xlsx` downloads.
8. Open the PDF and XLSX and confirm they include invoice number, invoice date, customer info, line items, quantities, unit prices, subtotals, tax, and total.
9. Update an item in the catalog, reopen the invoice detail page, and confirm the invoice still shows the stored snapshot values.
