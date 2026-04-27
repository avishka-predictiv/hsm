from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.doctor import Doctor, Specialization
from app.models.user import User
from app.schemas.doctor import DoctorOut, DoctorProfileUpdate, DoctorScheduleCreate, DoctorScheduleOut, SpecializationOut
from app.models.doctor import DoctorSchedule

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get("", response_model=List[DoctorOut])
async def list_doctors(
    name: Optional[str] = Query(None),
    specialization_id: Optional[int] = Query(None),
    page: int = 1,
    size: int = 20,
    db: AsyncSession = Depends(get_db),
):
    """Public: list all verified doctors with optional search."""
    query = (
        select(Doctor)
        .join(Doctor.user)
        .where(Doctor.is_verified == True)  # noqa
    )
    if name:
        query = query.where(User.email.ilike(f"%{name}%") | Doctor.bio.ilike(f"%{name}%"))
    if specialization_id:
        query = query.join(Doctor.specializations).where(Specialization.id == specialization_id)

    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    doctors = result.scalars().unique().all()

    out = []
    for d in doctors:
        user_res = await db.execute(select(User).where(User.id == d.user_id))
        user = user_res.scalar_one_or_none()
        doc_out = DoctorOut.model_validate(d)
        doc_out.email = user.email if user else None
        out.append(doc_out)
    return out


@router.get("/{doctor_id}", response_model=DoctorOut)
async def get_doctor(doctor_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Doctor).where(Doctor.id == doctor_id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Doctor not found")
    user_res = await db.execute(select(User).where(User.id == doctor.user_id))
    user = user_res.scalar_one_or_none()
    doc_out = DoctorOut.model_validate(doctor)
    doc_out.email = user.email if user else None
    return doc_out


@router.get("/{doctor_id}/availability")
async def get_doctor_availability(doctor_id: str, db: AsyncSession = Depends(get_db)):
    """Returns available sessions (dates + times) for a doctor."""
    from app.models.appointment import Session, SessionStatus
    from datetime import date
    result = await db.execute(
        select(Session)
        .where(Session.doctor_id == doctor_id, Session.status == SessionStatus.scheduled, Session.date >= date.today())
        .order_by(Session.date)
    )
    sessions = result.scalars().all()
    return [
        {
            "session_id": s.id,
            "date": str(s.date),
            "start_time": s.start_time,
            "end_time": s.end_time,
            "slot_duration_mins": s.slot_duration_mins,
            "max_patients": s.max_patients,
        }
        for s in sessions
    ]


# ------- Doctor-authenticated routes -------
@router.get("/profile/me", response_model=DoctorOut)
async def get_my_profile(
    current_user: User = Depends(require_role("doctor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Profile not found")
    doc_out = DoctorOut.model_validate(doctor)
    doc_out.email = current_user.email
    return doc_out


@router.put("/profile/me", response_model=DoctorOut)
async def update_my_profile(
    data: DoctorProfileUpdate,
    current_user: User = Depends(require_role("doctor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Profile not found")

    update_data = data.model_dump(exclude_unset=True)
    spec_ids = update_data.pop("specialization_ids", None)
    for k, v in update_data.items():
        setattr(doctor, k, v)
    if spec_ids is not None:
        specs = await db.execute(select(Specialization).where(Specialization.id.in_(spec_ids)))
        doctor.specializations = list(specs.scalars().all())

    doc_out = DoctorOut.model_validate(doctor)
    doc_out.email = current_user.email
    return doc_out


@router.get("/schedules/me", response_model=List[DoctorScheduleOut])
async def get_my_schedules(
    current_user: User = Depends(require_role("doctor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = result.scalar_one_or_none()
    schedule_res = await db.execute(select(DoctorSchedule).where(DoctorSchedule.doctor_id == doctor.id))
    return schedule_res.scalars().all()


@router.post("/schedules/me", response_model=DoctorScheduleOut)
async def create_schedule(
    data: DoctorScheduleCreate,
    current_user: User = Depends(require_role("doctor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = result.scalar_one_or_none()
    schedule = DoctorSchedule(doctor_id=doctor.id, **data.model_dump())
    db.add(schedule)
    await db.flush()
    return schedule
