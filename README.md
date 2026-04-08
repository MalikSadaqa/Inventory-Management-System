## Run With Docker

1. `docker compose up --build`
2. Frontend: `http://localhost:5173`
3. Backend health: `http://localhost:8000/health`

## Run Locally

1. Start PostgreSQL: `docker compose up -d postgres`
2. Backend:
   `cd backend && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && export POSTGRES_DB=printing_app POSTGRES_USER=postgres POSTGRES_PASSWORD=postgres POSTGRES_HOST=127.0.0.1 POSTGRES_PORT=5432 && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
3. Frontend:
   `cd frontend && npm install && VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev`

## Included Features

- Customers with name, email, and optional phone
- Customer detail with invoice history and tagged items
- Categories CRUD with detail page, path, child tree, and category search
- Items CRUD with safe delete protection when invoices reference an item
- Customer-tagged items with item/customer relational drill-ins
- Item detail with tagged customers and invoice appearances
- Invoices with immutable item snapshots
- Advanced invoice-line search with simplified item/customer/date filters
- Invoice PDF rendering with WeasyPrint
- Inline invoice PDF viewing, PDF download, browser print flow, and Excel export
- Improved invoice line editing with bottom-positioned `Add Line`

## Invoice Document Endpoints

- `GET /invoices/{invoice_id}/pdf` returns inline PDF
- `GET /invoices/{invoice_id}/pdf/download` returns attachment PDF
- `GET /invoices/{invoice_id}/excel` returns invoice XLSX export
- `GET /search/invoice-lines` returns paginated invoice-line search results

## Advanced Invoice-Line Search

- Frontend page: `http://localhost:5173/search/invoice-lines`
- Filters: item name, customer name, invoice date from, invoice date to
- Results: item, invoice, invoice date, customer, quantity, unit price, line total
- Drill-in: click item, customer, or invoice links directly, or click a row to open the invoice

## Item Tags

- Items can be tagged with one or more existing customers
- Item detail shows tagged customers and invoice appearances
- Customer detail shows items where that customer is tagged

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
10. Open `http://localhost:5173/search/invoice-lines`.
11. Search categories by name on `http://localhost:5173/categories` and confirm the filtered category list updates without breaking the tree view.
12. Search by item name on `http://localhost:5173/search/invoice-lines` and confirm only matching invoice lines are returned.
13. Search by customer name and confirm the results narrow correctly.
14. Apply a date range and confirm only invoices inside the selected range are returned.
15. Click item, customer, and invoice links from search results and confirm each opens the correct detail page.
16. Create or edit an item, add customer tags, save it, and confirm the tags persist on both item detail and customer detail pages.
17. Open an item detail page and confirm the invoices section lists invoice appearances with invoice links.
18. Click `Clear Filters` on invoice line search and confirm the form resets and the full result set returns.
