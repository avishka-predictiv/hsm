from __future__ import annotations

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

from app.schemas.diagnosis import DiagnosisOut


class AppointmentStatusEnum(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    doctor_withdrawn = "doctor_withdrawn"
    patient_withdrawn = "patient_withdrawn"
    doctor_absent = "doctor_absent"
    patient_absent = "patient_absent"


class AppointmentCreate(BaseModel):
    session_id: str
    symptoms_text: Optional[str] = None
    terms_accepted: bool = False
    selected_slot_number: Optional[int] = None


class AppointmentCancelRequest(BaseModel):
    reason: Optional[str] = None


class AppointmentSymptomsUpdate(BaseModel):
    symptoms_text: str


class AppointmentOut(BaseModel):
    id: str
    patient_id: str
    session_id: str
    doctor_id: str
    slot_number: int
    status: AppointmentStatusEnum
    cancellation_reason: Optional[str] = None
    cancelled_at: Optional[datetime] = None
    booked_at: datetime
    symptoms_text: Optional[str] = None
    terms_accepted: bool
    consultation_fee: Optional[float] = None
    diagnosis: Optional[DiagnosisOut] = None
    session: Optional["SessionOut"] = None

    model_config = {"from_attributes": True}


class SessionOut(BaseModel):
    id: str
    doctor_id: str
    date: date
    start_time: str
    end_time: str
    slot_duration_mins: int
    max_patients: int
    status: str
    booked_count: Optional[int] = 0

    model_config = {"from_attributes": True}


class SessionCreate(BaseModel):
    date: date
    start_time: str
    end_time: str
    slot_duration_mins: int = 15
    max_patients: int = 20
    schedule_id: Optional[str] = None


class SlotInfo(BaseModel):
    slot_number: int
    start_time: str
    is_available: bool
