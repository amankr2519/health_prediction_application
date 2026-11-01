from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ai_service import generate_remarks
from config import settings
from crud import PatientNotFoundError, create_patient, delete_patient, get_patient, list_patients, update_patient
from database import close_database, connect_database, ping_database
from models import PatientCreate, PatientUpdate

logger = logging.getLogger("health_prediction.api")


@asynccontextmanager
async def lifespan(_: FastAPI):
    connect_database()
    yield
    close_database()


app = FastAPI(title="Health Prediction API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"status": "ok", "message": "Health Prediction API is running"}


@app.get("/health")
@app.get("/api/health", include_in_schema=False)
def health_check():
    try:
        ping_database()
        return {"status": "healthy", "database": "connected"}
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Database is unavailable") from exc


@app.post("/api/patients", status_code=201)
def create_patient_route(patient: PatientCreate):
    try:
        created = create_patient(patient)
        if settings.groq_api_key:
            try:
                remarks = generate_remarks(created)
                return update_patient(
                    created["id"], PatientUpdate(remarks=remarks, remarks_status="completed")
                )
            except Exception:
                return update_patient(created["id"], PatientUpdate(remarks_status="failed"))
        return created
    except Exception as exc:
        logger.exception("Patient creation failed (%s)", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Could not save patient record") from exc


@app.get("/api/patients")
def list_patients_route():
    try:
        return list_patients()
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not retrieve patient records") from exc


@app.get("/api/patients/{patient_id}")
def get_patient_route(patient_id: str):
    try:
        return get_patient(patient_id)
    except PatientNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Patient not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid patient ID") from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not retrieve patient record") from exc


@app.put("/api/patients/{patient_id}")
def update_patient_route(patient_id: str, patient: PatientUpdate):
    try:
        return update_patient(patient_id, patient)
    except PatientNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Patient not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid patient ID") from exc
    except Exception as exc:
        logger.exception("Patient update failed (%s)", type(exc).__name__)
        raise HTTPException(status_code=503, detail="Could not update patient record") from exc


@app.delete("/api/patients/{patient_id}", status_code=204)
def delete_patient_route(patient_id: str):
    try:
        delete_patient(patient_id)
    except PatientNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Patient not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid patient ID") from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Could not delete patient record") from exc


@app.post("/api/patients/{patient_id}/remarks")
def generate_patient_remarks(patient_id: str):
    try:
        patient = get_patient(patient_id)
        remarks = generate_remarks(patient)
        return update_patient(patient_id, PatientUpdate(remarks=remarks, remarks_status="completed"))
    except PatientNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Patient not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid patient ID") from exc
    except Exception as exc:
        logger.exception("AI remarks generation failed for patient %s (%s)", patient_id, type(exc).__name__)
        try:
            update_patient(patient_id, PatientUpdate(remarks_status="failed"))
        except Exception:
            pass
        raise HTTPException(status_code=502, detail="Could not generate AI remarks; retry the request") from exc
