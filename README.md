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
