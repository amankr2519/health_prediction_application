# Health Prediction API

Base URL for local development: `http://127.0.0.1:8000`

Interactive Swagger documentation is available at `/docs`; the OpenAPI schema is at `/openapi.json`.

## Patient data

Patient objects returned by the API have this shape:

```json
{
  "id": "6650a1b2c3d4e5f678901234",
  "full_name": "Robyn Pears",
  "date_of_birth": "1960-01-28",
  "email": "robyn@gmail.com",
  "glucose": 232,
  "haemoglobin": 13.5,
  "cholesterol": 180,
  "remarks": null,
  "remarks_status": "pending",
  "created_at": "2026-10-30T12:30:00+00:00",
  "updated_at": "2026-10-30T12:30:00+00:00"
}
```

`id` is a string representation of MongoDB's ObjectId. Dates of birth are stored and returned as `YYYY-MM-DD`. Create and update requests accept `YYYY-MM-DD`, `DD/MM/YYYY`, or `DD.MM.YYYY`. Timestamps are ISO 8601 strings in UTC.

## Endpoints

| Method | Path | Success | Purpose |
|---|---|---:|---|
| `GET` | `/` | 200 | Confirm the API is running |
| `GET` | `/health` | 200 / 503 | Check MongoDB connectivity |
| `POST` | `/api/patients` | 201 | Create a patient |
| `GET` | `/api/patients` | 200 | List patients, newest first |
| `GET` | `/api/patients/{patient_id}` | 200 | Retrieve one patient |
| `PUT` | `/api/patients/{patient_id}` | 200 | Update supplied patient fields |
| `DELETE` | `/api/patients/{patient_id}` | 204 | Delete a patient |
| `POST` | `/api/patients/{patient_id}/remarks` | 200 | Generate or retry AI remarks |

## Create a patient

`POST /api/patients`

Required JSON fields:

```json
{
  "full_name": "Robyn Pears",
  "date_of_birth": "28/01/1960",
  "email": "robyn@gmail.com",
  "glucose": 232,
  "haemoglobin": 13.5,
  "cholesterol": 180
}
```

Optional fields are `remarks` (string or `null`) and `remarks_status` (`pending`, `completed`, or `failed`). They default to `null` and `pending`. If `GROQ_API_KEY` is configured, creation also attempts to generate remarks. A provider failure leaves the patient saved and sets `remarks_status` to `failed`.

## Read patients

- `GET /api/patients` returns a JSON array. An empty collection returns `[]`.
- `GET /api/patients/{patient_id}` returns one patient object.

## Update a patient

`PUT /api/patients/{patient_id}` accepts any subset of patient fields. For example, update just the email:

```json
{
  "email": "gokul@infocare.com"
}
```

An empty JSON object is accepted and returns the current record without changing it. `updated_at` changes when at least one field is supplied.

## Delete a patient

`DELETE /api/patients/{patient_id}` returns `204 No Content` on success. The frontend should ask the user to confirm before calling this endpoint and refresh the list afterward.

## Generate or retry remarks

`POST /api/patients/{patient_id}/remarks` sends the patient's glucose, haemoglobin, and cholesterol values to Groq. On success it returns the updated patient object with `remarks_status: "completed"`. On provider failure, the status is set to `failed` and the endpoint returns `502`; call it again to retry.

The generated observation is not a medical diagnosis. It is intentionally cautious because units and reference ranges are not supplied.

## Validation and errors

FastAPI returns `422 Unprocessable Entity` for invalid request fields. Validation includes:

- non-empty full name;
- valid email format;
- valid calendar date, not in the future;
- numeric glucose, haemoglobin, and cholesterol values.

Date input accepts `YYYY-MM-DD`, `DD/MM/YYYY`, and `DD.MM.YYYY`. Invalid supplied dates (for example, `31.11.2001`) are rejected; inputs are not silently corrected.

Common endpoint errors:

| Status | Meaning |
|---:|---|
| 400 | Patient ID is not a valid MongoDB ObjectId |
| 404 | No patient exists with that ID |
| 422 | Request body failed validation |
| 502 | AI remarks request failed; retry may succeed |
| 503 | MongoDB or a patient database operation is unavailable |

Error responses contain a `detail` field. For example:

```json
{
  "detail": "Patient not found"
}
```

## Frontend integration notes

- Send and receive JSON with `Content-Type: application/json` for requests with a body.
- Configure `VITE_API_BASE_URL=http://127.0.0.1:8000` in the frontend if the frontend uses an environment variable for its API base URL. The backend does not require this variable.
- The backend permits `http://localhost:5173` by default. Set `CORS_ORIGINS` in `backend/.env` to a comma-separated list if the frontend runs at another origin.
- No authentication is currently implemented.
