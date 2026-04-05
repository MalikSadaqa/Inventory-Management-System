## Milestone 1

1. Start PostgreSQL: `docker compose up -d`
2. Run backend from `backend/`:
   `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && cp .env.example .env && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
3. Run frontend from `frontend/`:
   `cp .env.example .env && npm install && npm run dev`

Frontend reads `VITE_API_BASE_URL` and defaults to `http://127.0.0.1:8000`.
Customers CRUD is available at `/customers`, including search and customer detail with an invoices placeholder section.
