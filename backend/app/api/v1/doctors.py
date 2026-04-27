from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, delete
from sqlalchemy.orm import selectinload
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.doctor import Doctor, Specialization
from app.models.user import User
from app.schemas.doctor import DoctorOut, DoctorProfileUpdate, DoctorScheduleCreate, DoctorScheduleOut, DoctorScheduleUpdate, SpecializationOut
from app.models.doctor import DoctorSchedule
from app.models.appointment import Session, SessionStatus, Appointment
from datetime import date, timedelta

router = APIRouter(prefix="/doctors", tags=["Doctors"])


_DOW = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}


async def _ensure_upcoming_sessions_from_schedule(
    db: AsyncSession,
    doctor_id: str,
    schedule: DoctorSchedule,
    days_ahead: int = 14,
):
    """Materialize weekly schedule into dated sessions for patient booking."""
    if not schedule.is_active:
        return

    dow = _DOW.get(schedule.day_of_week)
    if dow is None:
        return

    start = date.today()
    end = start + timedelta(days=days_ahead)

    # Load existing sessions for this schedule in range
    existing_res = await db.execute(
        select(Session).where(
            Session.doctor_id == doctor_id,
            Session.schedule_id == schedule.id,
            Session.date >= start,
            Session.date <= end,
            Session.status == SessionStatus.scheduled,
        )
    )
    existing_dates = {s.date for s in existing_res.scalars().all()}

    d = start
    while d <= end:
        if d.weekday() == dow and d not in existing_dates:
            db.add(
                Session(
                    doctor_id=doctor_id,
                    schedule_id=schedule.id,
                    date=d,
                    start_time=schedule.start_time,
                    end_time=schedule.end_time,
                    slot_duration_mins=schedule.slot_duration_mins,
                    max_patients=schedule.max_patients,
                    status=SessionStatus.scheduled,
                )
            )
        d += timedelta(days=1)
    await db.flush()


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
        .options(selectinload(Doctor.specializations))
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
    result = await db.execute(
        select(Doctor)
        .options(selectinload(Doctor.specializations))
        .where(Doctor.id == doctor_id)
    )
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
    result = await db.execute(
        select(Doctor)
        .options(selectinload(Doctor.specializations))
        .where(Doctor.user_id == current_user.id)
    )
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
    result = await db.execute(
        select(Doctor)
        .options(selectinload(Doctor.specializations))
        .where(Doctor.user_id == current_user.id)
    )
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
    if not doctor:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Profile not found")
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
    if not doctor:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Profile not found")
    schedule = DoctorSchedule(doctor_id=doctor.id, **data.model_dump())
    db.add(schedule)
    await db.flush()
    await _ensure_upcoming_sessions_from_schedule(db, doctor.id, schedule, days_ahead=14)
    return schedule


@router.put("/schedules/me/{schedule_id}", response_model=DoctorScheduleOut)
async def update_schedule(
    schedule_id: str,
    data: DoctorScheduleUpdate,
    current_user: User = Depends(require_role("doctor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Profile not found")

    sched_res = await db.execute(
        select(DoctorSchedule).where(DoctorSchedule.id == schedule_id, DoctorSchedule.doctor_id == doctor.id)
    )
    sched = sched_res.scalar_one_or_none()
    if not sched:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Schedule not found")

    # Delete future generated sessions for this schedule (only if no bookings)
    today = date.today()
    future_sessions_res = await db.execute(
        select(Session).where(
            Session.schedule_id == sched.id,
            Session.doctor_id == doctor.id,
            Session.date >= today,
            Session.status == SessionStatus.scheduled,
        )
    )
    future_sessions = future_sessions_res.scalars().all()
    if future_sessions:
        ids = [s.id for s in future_sessions]
        booked = await db.execute(select(Appointment.session_id).where(Appointment.session_id.in_(ids)))
        if booked.first():
            from fastapi import HTTPException
            raise HTTPException(status_code=409, detail="Cannot edit schedule: future sessions already have bookings")
        await db.execute(delete(Session).where(Session.id.in_(ids)))

    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(sched, k, v)
    await db.flush()
    await _ensure_upcoming_sessions_from_schedule(db, doctor.id, sched, days_ahead=14)
    return sched


@router.delete("/schedules/me/{schedule_id}")
async def delete_schedule(
    schedule_id: str,
    current_user: User = Depends(require_role("doctor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = result.scalar_one_or_none()
    if not doctor:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Profile not found")

    sched_res = await db.execute(
        select(DoctorSchedule).where(DoctorSchedule.id == schedule_id, DoctorSchedule.doctor_id == doctor.id)
    )
    sched = sched_res.scalar_one_or_none()
    if not sched:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Schedule not found")

    today = date.today()
    future_sessions_res = await db.execute(
        select(Session).where(
            Session.schedule_id == sched.id,
            Session.doctor_id == doctor.id,
            Session.date >= today,
            Session.status == SessionStatus.scheduled,
        )
    )
    future_sessions = future_sessions_res.scalars().all()
    if future_sessions:
        ids = [s.id for s in future_sessions]
        booked = await db.execute(select(Appointment.session_id).where(Appointment.session_id.in_(ids)))
        if booked.first():
            from fastapi import HTTPException
            raise HTTPException(status_code=409, detail="Cannot delete schedule: future sessions already have bookings")
        await db.execute(delete(Session).where(Session.id.in_(ids)))

    await db.delete(sched)
    return {"message": "Schedule deleted", "schedule_id": schedule_id}
