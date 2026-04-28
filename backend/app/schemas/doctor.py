from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class SpecializationOut(BaseModel):
    id: int
    code: str
    name: str

    model_config = {"from_attributes": True}


class DoctorProfileCreate(BaseModel):
    name: Optional[str] = None
    nic: str
    mobile: str
    reg_number: str
    specialization_ids: List[int]
    years_experience: Optional[int] = None
    qualifications: Optional[str] = None
    consultation_fee: Optional[float] = None
    affiliation: Optional[str] = None
    bio: Optional[str] = None


class DoctorProfileUpdate(BaseModel):
    name: Optional[str] = None
    mobile: Optional[str] = None
    specialization_ids: Optional[List[int]] = None
    years_experience: Optional[int] = None
    qualifications: Optional[str] = None
    consultation_fee: Optional[float] = None
    affiliation: Optional[str] = None
    bio: Optional[str] = None


class DoctorOut(BaseModel):
    id: str
    user_id: str
    name: Optional[str] = None
    nic: str
    mobile: str
    reg_number: str
    years_experience: Optional[int] = None
    qualifications: Optional[str] = None
    consultation_fee: Optional[float] = None
    affiliation: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    is_verified: bool
    specializations: List[SpecializationOut] = []
    email: Optional[str] = None  # joined from user

    model_config = {"from_attributes": True}


class DoctorScheduleCreate(BaseModel):
    day_of_week: str
    start_time: str
    end_time: str
    slot_duration_mins: int = 15
    max_patients: int = 20


class DoctorScheduleUpdate(BaseModel):
    day_of_week: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    slot_duration_mins: Optional[int] = None
    max_patients: Optional[int] = None
    is_active: Optional[bool] = None


class DoctorScheduleOut(BaseModel):
    id: str
    doctor_id: str
    day_of_week: str
    start_time: str
    end_time: str
    slot_duration_mins: int
    max_patients: int
    is_active: bool

    model_config = {"from_attributes": True}
