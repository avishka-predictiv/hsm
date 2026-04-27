from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime


class PatientProfileCreate(BaseModel):
    nic: str
    mobile: str
    address: str
    dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    known_allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    insurance_info: Optional[str] = None


class PatientProfileUpdate(BaseModel):
    mobile: Optional[str] = None
    address: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    known_allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    insurance_info: Optional[str] = None


class PatientOut(BaseModel):
    id: str
    user_id: str
    nic: str
    mobile: str
    address: str
    dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    known_allergies: Optional[str] = None
    chronic_conditions: Optional[str] = None
    insurance_info: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
