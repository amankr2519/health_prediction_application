# Backend

FastAPI service for patient records in MongoDB Atlas and optional AI-generated observations through Groq.

## Requirements

- Python 3.10 or newer
- MongoDB Atlas connection string
- Groq API key for AI remarks (optional for CRUD)

## Setup

Run these commands from the `backend` directory:

```bash
uv venv
uv pip install --python .venv/bin/python -r requirements.txt
cp .env.example .env
```

Edit `.env` and provide `MONGO_URI`. Set `GROQ_API_KEY` to enable AI remarks. Never commit `.env`; the repository `.gitignore` excludes it.

Configuration variables:

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `MONGO_URI` | Yes for database use | — | MongoDB Atlas connection URI |
| `MONGO_DATABASE` | No | `health_prediction_db` | Database name; records use the `patients` collection |
| `GROQ_API_KEY` | No | — | Enables generation of remarks |
| `GROQ_MODEL` | No | `openai/gpt-oss-20b` | Groq model name |
| `CORS_ORIGINS` | No | `http://localhost:5173` | Comma-separated allowed frontend origins |

## Run

```bash
.venv/bin/uvicorn main:app --reload
```

The API listens on `http://127.0.0.1:8000`. Open `/docs` for interactive API documentation. `GET /health` reports MongoDB connectivity; the API process can start even if MongoDB is unavailable, but database routes will return an error until it is reachable.

## Backend layout

| File | Responsibility |
|---|---|
| `main.py` | FastAPI app, CORS, lifecycle, route handlers, HTTP error mapping |
| `models.py` | Pydantic request schemas and independent backend validation |
| `config.py` | Loads environment configuration |
| `database.py` | MongoDB client lifecycle and collection access |
| `crud.py` | MongoDB patient create/read/update/delete and serialization |
| `ai_service.py` | Groq client call for patient observations |
| `api-docs.md` | Endpoint details and frontend integration contract |
| `requirements.txt` | Python dependencies for pip or uv |

Patient IDs are MongoDB ObjectIds serialized as strings. Birth dates are stored as ISO date strings (`YYYY-MM-DD`); timestamps are UTC. AI remarks are stored with a `remarks_status` of `pending`, `completed`, or `failed`.

## Request flow

Patient requests are validated by Pydantic before the route calls the CRUD module. MongoDB operations are isolated in `crud.py`. When a Groq key is configured, patient creation attempts AI remarks generation; the dedicated remarks endpoint can generate or retry them later. AI output is informational and not a diagnosis.

See [api-docs.md](api-docs.md) for request/response examples, validation rules, status codes, and frontend setup details.
