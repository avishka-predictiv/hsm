from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    patient = "patient"
    doctor = "doctor"
    admin = "admin"


class UserBase(BaseModel):
    email: EmailStr
    role: UserRole


class UserOut(BaseModel):
    id: str
    email: str
    role: UserRole
    is_active: bool
    profile_complete: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str


class AdminLoginRequest(BaseModel):
    email: str
    password: str


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole
