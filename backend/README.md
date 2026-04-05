1. Create a virtual environment and install dependencies: `python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
2. Copy env file if needed: `cp .env.example .env`
3. Run the API: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
