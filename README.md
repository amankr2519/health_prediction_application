# Health Prediction App

A React frontend and FastAPI backend for managing patient records, including glucose, haemoglobin, cholesterol, and optional AI-generated observations. Patient records are stored in MongoDB. AI observations are informational and are not medical diagnoses.

## Features

- Create, view, update, and delete patient records.
- Validate patient names, email addresses, dates of birth, and blood test values in the backend.
- Enter dates in the patient form as `DD/MM/YYYY` (for example, `28/01/1960`). The backend also accepts `YYYY-MM-DD` and `DD.MM.YYYY`; it rejects invalid calendar dates and dates in the future.
- Optionally generate or retry observations using Groq.
- Browse API documentation through FastAPI Swagger UI.

## Requirements

- Python 3.10 or newer
- Node.js and npm
- MongoDB Atlas connection URI
- Groq API key (optional; CRUD works without AI remarks)

## Configuration

Create the backend environment file and set your MongoDB URI:

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`. `MONGO_URI` is needed for database operations. `GROQ_API_KEY` enables AI remarks. Available settings:

| Variable | Default | Purpose |
|---|---|---|
| `MONGO_URI` | — | MongoDB Atlas connection URI |
| `MONGO_DATABASE` | `health_prediction_db` | Database name; patient records use the `patients` collection |
| `GROQ_API_KEY` | — | Groq API key; optional |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Groq model |
| `CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed frontend origins |

Keep `.env` files private; do not commit credentials.

## Run locally

Start the backend in one terminal:

```bash
cd backend
uv venv
uv pip install --python .venv/bin/python -r requirements.txt
.venv/bin/uvicorn main:app --reload
```

Start the frontend in another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend is served at `http://localhost:5173`; the API is at `http://127.0.0.1:8000`. The frontend defaults to that API URL. To change it, set `VITE_API_BASE_URL` in `frontend/.env` (for example, `VITE_API_BASE_URL=http://127.0.0.1:8000`). If the frontend origin changes, add it to `CORS_ORIGINS` in `backend/.env`.

## API

Open `http://127.0.0.1:8000/docs` for interactive Swagger documentation. `GET /health` reports database connectivity. Main patient endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/patients` | List patients |
| `POST` | `/api/patients` | Create a patient |
| `GET` | `/api/patients/{patient_id}` | Get one patient |
| `PUT` | `/api/patients/{patient_id}` | Update supplied fields |
| `DELETE` | `/api/patients/{patient_id}` | Delete a patient |
| `POST` | `/api/patients/{patient_id}/remarks` | Generate or retry AI remarks |

See [backend/api-docs.md](backend/api-docs.md) for request formats, validation behavior, and error responses.

## Data and validation notes

Patient IDs are MongoDB ObjectIds represented as strings. Birth dates are stored and returned as `YYYY-MM-DD`; timestamps are UTC. The frontend accepts a typed date of birth in `DD/MM/YYYY` format. The backend independently validates dates in `YYYY-MM-DD`, `DD/MM/YYYY`, or `DD.MM.YYYY` format, along with email addresses and numeric test values. Invalid data receives a `422 Unprocessable Entity` response with field-level validation details; it is not saved or silently corrected.

For the supplied demonstration records, `hunter@gmail` is rejected as an invalid email, `31.11.2001` is rejected because November has only 30 days, and Kris Wu's record is rejected for its invalid email and future date of birth. The duplicate Robyn Pears entry is allowed and stored as a separate patient record.

When Groq is configured, patient creation attempts to generate remarks. If that request fails, the patient remains saved with a failed remarks status; use the remarks endpoint to retry. AI output is cautious and informational; clinical interpretation requires appropriate units, reference ranges, and professional assessment.
