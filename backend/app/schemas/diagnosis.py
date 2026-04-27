from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date
from enum import Enum


class DiagnosisCreate(BaseModel):
    symptoms_observed: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    follow_up_notes: Optional[str] = None
    next_visit_date: Optional[date] = None  # doctor-recommended next visit


class DiagnosisUpdate(BaseModel):
    symptoms_observed: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    follow_up_notes: Optional[str] = None
    next_visit_date: Optional[date] = None


class DiagnosisOut(BaseModel):
    id: str
    appointment_id: str
    doctor_id: str
    symptoms_observed: Optional[str] = None
    diagnosis: Optional[str] = None
    prescription: Optional[str] = None
    follow_up_notes: Optional[str] = None
    next_visit_date: Optional[date] = None
    ai_summary: Optional[str] = None
    ai_generated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
