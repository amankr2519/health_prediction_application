from datetime import date, datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def parse_dob(value: date | str) -> date:
    if isinstance(value, date):
        parsed = value
    else:
        raw = value.strip()
        parsed = None
        for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d.%m.%Y"):
            try:
                parsed = datetime.strptime(raw, fmt).date()
                break
            except ValueError:
                continue
        if parsed is None:
            raise ValueError("Date of birth must be a valid date in YYYY-MM-DD, DD/MM/YYYY, or DD.MM.YYYY format")
    if parsed > datetime.now(timezone.utc).date():
        raise ValueError("Date of birth cannot be in the future")
    return parsed


class PatientCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str = Field(min_length=1, max_length=150)
    date_of_birth: date
    email: EmailStr
    glucose: float
    haemoglobin: float
    cholesterol: float
    remarks: str | None = None
    remarks_status: Literal["pending", "completed", "failed"] = "pending"

    @field_validator("full_name")
    @classmethod
    def name_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Full name must not be empty")
        return value

    @field_validator("date_of_birth", mode="before")
    @classmethod
    def validate_dob(cls, value):
        return parse_dob(value)

    @field_validator("glucose", "haemoglobin", "cholesterol", mode="before")
    @classmethod
    def numeric_values(cls, value):
        if isinstance(value, bool):
            raise ValueError("Value must be numeric")
        return value


class PatientUpdate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    full_name: str | None = Field(default=None, min_length=1, max_length=150)
    date_of_birth: date | None = None
    email: EmailStr | None = None
    glucose: float | None = None
    haemoglobin: float | None = None
    cholesterol: float | None = None
    remarks: str | None = None
    remarks_status: Literal["pending", "completed", "failed"] | None = None

    @field_validator("full_name")
    @classmethod
    def name_not_blank(cls, value):
        if value is not None and not value.strip():
            raise ValueError("Full name must not be empty")
        return value

    @field_validator("date_of_birth", mode="before")
    @classmethod
    def validate_dob(cls, value):
        return None if value is None else parse_dob(value)

    @field_validator("glucose", "haemoglobin", "cholesterol", mode="before")
    @classmethod
    def numeric_values(cls, value):
        if isinstance(value, bool):
            raise ValueError("Value must be numeric")
        return value
