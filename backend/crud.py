from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId

from database import patients_collection
from models import PatientCreate, PatientUpdate


class PatientNotFoundError(Exception):
    pass


def serialize_patient(document: dict) -> dict:
    document["id"] = str(document.pop("_id"))
    date_of_birth = document["date_of_birth"]
    document["date_of_birth"] = date_of_birth.isoformat() if hasattr(date_of_birth, "isoformat") else str(date_of_birth)
    for field in ("created_at", "updated_at"):
        if document.get(field):
            document[field] = document[field].isoformat()
    return document


def parse_object_id(patient_id: str) -> ObjectId:
    try:
        return ObjectId(patient_id)
    except (InvalidId, TypeError):
        raise ValueError("Invalid patient ID") from None


def create_patient(patient: PatientCreate) -> dict:
    now = datetime.now(timezone.utc)
    data = patient.model_dump(mode="python")
    data["date_of_birth"] = data["date_of_birth"].isoformat()
    data.update(created_at=now, updated_at=now)
    result = patients_collection().insert_one(data)
    return serialize_patient(patients_collection().find_one({"_id": result.inserted_id}))


def list_patients() -> list[dict]:
    return [serialize_patient(document) for document in patients_collection().find().sort("created_at", -1)]


def get_patient(patient_id: str) -> dict:
    document = patients_collection().find_one({"_id": parse_object_id(patient_id)})
    if document is None:
        raise PatientNotFoundError
    return serialize_patient(document)


def update_patient(patient_id: str, patient: PatientUpdate) -> dict:
    changes = patient.model_dump(exclude_unset=True, mode="python")
    if not changes:
        return get_patient(patient_id)
    changes["updated_at"] = datetime.now(timezone.utc)
    result = patients_collection().update_one({"_id": parse_object_id(patient_id)}, {"$set": changes})
    if result.matched_count == 0:
        raise PatientNotFoundError
    return get_patient(patient_id)


def delete_patient(patient_id: str) -> None:
    result = patients_collection().delete_one({"_id": parse_object_id(patient_id)})
    if result.deleted_count == 0:
        raise PatientNotFoundError
