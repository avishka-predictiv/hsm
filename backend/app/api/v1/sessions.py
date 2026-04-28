from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import date

from app.core.database import get_db
from app.core.security import require_role, get_current_user
from app.models.user import User
from app.models.doctor import Doctor
from app.models.appointment import Session, SessionStatus, Appointment, AppointmentStatus
from app.models.diagnosis import Diagnosis
from app.models.patient import Patient
from app.schemas.appointment import SessionCreate, SessionOut
from app.schemas.diagnosis import DiagnosisCreate, DiagnosisOut

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("/my", response_model=List[SessionOut])
async def get_my_sessions(
    upcoming: bool = True,
    current_user: User = Depends(require_role("doctor")),
    db: AsyncSession = Depends(get_db),
):
    doc_res = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = doc_res.scalar_one_or_none()

    query = select(Session).where(Session.doctor_id == doctor.id)
    if upcoming:
        query = query.where(Session.date >= date.today(), Session.status == SessionStatus.scheduled)
    else:
        query = query.where(Session.date < date.today())
    query = query.order_by(Session.date.desc())

    result = await db.execute(query)
    sessions = result.scalars().all()

    out = []
    for s in sessions:
        count_res = await db.execute(
            select(Session).where(Appointment.session_id == s.id)
        )
        so = SessionOut.model_validate(s)
        out.append(so)
    return out


@router.get("/today", response_model=List[SessionOut])
async def today_sessions(
    current_user: User = Depends(require_role("doctor")),
    db: AsyncSession = Depends(get_db),
):
    doc_res = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = doc_res.scalar_one_or_none()

    result = await db.execute(
        select(Session)
        .where(Session.doctor_id == doctor.id, Session.date == date.today())
        .order_by(Session.start_time)
    )
    return result.scalars().all()


@router.post("", response_model=SessionOut)
async def create_session(
    data: SessionCreate,
    current_user: User = Depends(require_role("doctor")),
    db: AsyncSession = Depends(get_db),
):
    doc_res = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = doc_res.scalar_one_or_none()
    import uuid
    session = Session(id=str(uuid.uuid4()), doctor_id=doctor.id, **data.model_dump())
    db.add(session)
    await db.flush()
    return session


@router.get("/{session_id}/info")
async def session_info(session_id: str, db: AsyncSession = Depends(get_db)):
    """Return session details + doctor's consultation fee. No auth required (used on booking page)."""
    from sqlalchemy import select as _select
    res = await db.execute(
        _select(Session, Doctor, User)
        .join(Doctor, Doctor.id == Session.doctor_id)
        .join(User, User.id == Doctor.user_id)
        .where(Session.id == session_id)
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    session, doctor, user = row
    return {
        "session_id": session_id,
        "date": str(session.date),
        "start_time": session.start_time[:5],
        "doctor_id": doctor.id,
        "doctor_email": user.email,
        "consultation_fee": float(doctor.consultation_fee) if doctor.consultation_fee else 0.0,
    }


@router.post("/{session_id}/start")
async def start_session(
    session_id: str,
    current_user: User = Depends(require_role("doctor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.status = SessionStatus.active
    return {"message": "Session started", "session_id": session_id}


@router.post("/{session_id}/end")
async def end_session(
    session_id: str,
    current_user: User = Depends(require_role("doctor")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Session).where(Session.id == session_id))
    session = result.scalar_one_or_none()
    session.status = SessionStatus.completed
    return {"message": "Session ended", "session_id": session_id}


@router.get("/{session_id}/patients")
async def get_session_patients(
    session_id: str,
    current_user: User = Depends(require_role("doctor")),
    db: AsyncSession = Depends(get_db),
):
    """Patient queue for the current session."""
    result = await db.execute(
        select(Appointment)
        .where(
            Appointment.session_id == session_id,
            Appointment.status.in_([AppointmentStatus.confirmed, AppointmentStatus.completed]),
        )
        .order_by(Appointment.slot_number)
    )
    appointments = result.scalars().all()

    patients_out = []
    for appt in appointments:
        pat_res = await db.execute(
            select(Patient).join(Patient.user).where(Patient.id == appt.patient_id)
        )
        patient = pat_res.scalar_one_or_none()
        user_res = await db.execute(select(User).where(User.id == patient.user_id))
        user = user_res.scalar_one_or_none()

        diag_res = await db.execute(select(Diagnosis).where(Diagnosis.appointment_id == appt.id))
        diag = diag_res.scalar_one_or_none()

        patients_out.append({
            "appointment_id": appt.id,
            "slot_number": appt.slot_number,
            "status": appt.status,
            "patient": {
                "id": patient.id,
                "nic": patient.nic,
                "email": user.email if user else None,
                "mobile": patient.mobile,
                "blood_group": patient.blood_group,
                "known_allergies": patient.known_allergies,
                "chronic_conditions": patient.chronic_conditions,
                "dob": patient.dob.isoformat() if patient.dob else None,
                "gender": patient.gender,
            },
            "has_diagnosis": diag is not None,
            "symptoms_text": appt.symptoms_text,
            "diagnosis": ({
                "symptoms_observed": diag.symptoms_observed,
                "diagnosis": diag.diagnosis,
                "prescription": diag.prescription,
                "follow_up_notes": diag.follow_up_notes,
                "next_visit_date": diag.next_visit_date.isoformat() if diag.next_visit_date else None,
                "medreasoner_diagnosis": diag.medreasoner_diagnosis,
                "medreasoner_session_id": diag.medreasoner_session_id,
            } if diag else None),
        })
    return patients_out


@router.post("/{session_id}/appointments/{appointment_id}/diagnosis", response_model=DiagnosisOut)
async def save_diagnosis(
    session_id: str,
    appointment_id: str,
    data: DiagnosisCreate,
    current_user: User = Depends(require_role("doctor")),
    db: AsyncSession = Depends(get_db),
):
    doc_res = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
    doctor = doc_res.scalar_one_or_none()

    appt_res = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = appt_res.scalar_one_or_none()
    if not appt or appt.session_id != session_id:
        raise HTTPException(status_code=404, detail="Appointment not found in this session")

    # Upsert diagnosis
    diag_res = await db.execute(select(Diagnosis).where(Diagnosis.appointment_id == appointment_id))
    diag = diag_res.scalar_one_or_none()
    if diag:
        for k, v in data.model_dump(exclude_unset=True).items():
            setattr(diag, k, v)
    else:
        import uuid
        diag = Diagnosis(
            id=str(uuid.uuid4()),
            appointment_id=appointment_id,
            doctor_id=doctor.id,
            **data.model_dump(),
        )
        db.add(diag)
        # Mark appointment completed
        appt.status = AppointmentStatus.completed

    await db.flush()
    return diag
