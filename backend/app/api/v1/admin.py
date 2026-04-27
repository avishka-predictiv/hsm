from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User, UserRole
from app.models.doctor import Doctor, Specialization
from app.models.patient import Patient
from app.models.appointment import Appointment, Session
from app.models.payment import Payment
from app.models.audit import AuditLog, SystemSetting
from app.schemas.doctor import SpecializationOut
import uuid

router = APIRouter(prefix="/admin", tags=["Admin"])


def _admin_required():
    return require_role("admin")


@router.get("/stats")
async def system_stats(
    current_user: User = Depends(_admin_required()),
    db: AsyncSession = Depends(get_db),
):
    total_patients = (await db.execute(select(func.count(Patient.id)))).scalar()
    total_doctors = (await db.execute(select(func.count(Doctor.id)))).scalar()
    total_appointments = (await db.execute(select(func.count(Appointment.id)))).scalar()
    total_revenue = (await db.execute(select(func.sum(Payment.amount)).where(Payment.status == "success"))).scalar()

    return {
        "total_patients": total_patients,
        "total_doctors": total_doctors,
        "total_appointments": total_appointments,
        "total_revenue": float(total_revenue or 0),
    }


@router.get("/users")
async def list_users(
    role: Optional[str] = Query(None),
    page: int = 1,
    size: int = 20,
    current_user: User = Depends(_admin_required()),
    db: AsyncSession = Depends(get_db),
):
    query = select(User)
    if role:
        query = query.where(User.role == role)
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    current_user: User = Depends(_admin_required()),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    return {"user_id": user_id, "is_active": user.is_active}


@router.put("/doctors/{doctor_id}/verify")
async def verify_doctor(
    doctor_id: str,
    current_user: User = Depends(_admin_required()),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    doctor.is_verified = True
    return {"message": "Doctor verified", "doctor_id": doctor_id}


@router.get("/appointments")
async def list_all_appointments(
    page: int = 1,
    size: int = 20,
    current_user: User = Depends(_admin_required()),
    db: AsyncSession = Depends(get_db),
):
    query = select(Appointment).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/payments")
async def list_all_payments(
    page: int = 1,
    size: int = 20,
    current_user: User = Depends(_admin_required()),
    db: AsyncSession = Depends(get_db),
):
    query = select(Payment).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/audit-logs")
async def list_audit_logs(
    page: int = 1,
    size: int = 50,
    current_user: User = Depends(_admin_required()),
    db: AsyncSession = Depends(get_db),
):
    query = select(AuditLog).order_by(AuditLog.timestamp.desc()).offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "actor_id": l.actor_id,
            "action": l.action,
            "target_type": l.target_type,
            "target_id": l.target_id,
            "timestamp": l.timestamp,
        }
        for l in logs
    ]


# Specialization management
@router.post("/specializations", response_model=SpecializationOut)
async def add_specialization(
    name: str,
    code: str,
    current_user: User = Depends(_admin_required()),
    db: AsyncSession = Depends(get_db),
):
    spec = Specialization(code=code, name=name)
    db.add(spec)
    await db.flush()
    return spec


@router.put("/specializations/{spec_id}", response_model=SpecializationOut)
async def update_specialization(
    spec_id: int,
    name: str,
    current_user: User = Depends(_admin_required()),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Specialization).where(Specialization.id == spec_id))
    spec = result.scalar_one_or_none()
    if not spec:
        raise HTTPException(status_code=404, detail="Specialization not found")
    spec.name = name
    return spec


# System settings
@router.get("/settings")
async def get_settings(
    current_user: User = Depends(_admin_required()),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SystemSetting))
    settings = result.scalars().all()
    return {s.key: s.value for s in settings}


@router.put("/settings/{key}")
async def update_setting(
    key: str,
    value: dict,
    current_user: User = Depends(_admin_required()),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SystemSetting).where(SystemSetting.key == key))
    setting = result.scalar_one_or_none()
    if setting:
        setting.value = value
        setting.updated_by = current_user.id
    else:
        setting = SystemSetting(key=key, value=value, updated_by=current_user.id)
        db.add(setting)
    return {"key": key, "value": value}
