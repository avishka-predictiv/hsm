from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, timezone, timedelta
import uuid, os, aiofiles

from app.core.database import get_db
from app.core.config import settings
from app.core.security import require_role, get_current_user
from app.models.user import User
from app.models.patient import Patient
from app.models.doctor import Doctor
from app.models.appointment import Appointment, AppointmentStatus, AppointmentAttachment, Session
from app.schemas.appointment import AppointmentCreate, AppointmentOut, AppointmentCancelRequest, SlotInfo
from app.services import notification as notif_svc

router = APIRouter(prefix="/appointments", tags=["Appointments"])

CANCELLATION_FULL_REFUND_HOURS = 24   # hours before appointment for full refund


def _get_status_for_cancellation(actor_role: str) -> AppointmentStatus:
    if actor_role == "patient":
        return AppointmentStatus.patient_withdrawn
    return AppointmentStatus.doctor_withdrawn


@router.post("", response_model=AppointmentOut)
async def book_appointment(
    data: AppointmentCreate,
    current_user: User = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    """Book the next available slot in a session."""
    if not data.terms_accepted:
        raise HTTPException(status_code=400, detail="You must accept the terms and conditions")

    # Get patient
    pat_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    # Get session
    sess_res = await db.execute(select(Session).where(Session.id == data.session_id))
    session = sess_res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check patient not already booked
    existing = await db.execute(
        select(Appointment).where(
            Appointment.session_id == data.session_id,
            Appointment.patient_id == patient.id,
            Appointment.status.not_in([
                AppointmentStatus.patient_withdrawn,
                AppointmentStatus.doctor_withdrawn,
            ]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already booked for this session")

    booked_res = await db.execute(
        select(Appointment.slot_number).where(
            Appointment.session_id == data.session_id,
            Appointment.status.not_in([
                AppointmentStatus.patient_withdrawn,
                AppointmentStatus.doctor_withdrawn,
            ]),
        )
    )
    booked_slots = {row[0] for row in booked_res.fetchall()}

    if data.selected_slot_number is not None:
        if data.selected_slot_number < 1 or data.selected_slot_number > session.max_patients:
            raise HTTPException(status_code=400, detail="Selected slot number is invalid")
        if data.selected_slot_number in booked_slots:
            raise HTTPException(status_code=409, detail="Selected slot is already booked")
        slot_number = data.selected_slot_number
    else:
        slot_number = next((i for i in range(1, session.max_patients + 1) if i not in booked_slots), None)
        if slot_number is None:
            raise HTTPException(status_code=409, detail="Session is fully booked")

    appointment = Appointment(
        id=str(uuid.uuid4()),
        patient_id=patient.id,
        session_id=data.session_id,
        doctor_id=session.doctor_id,
        slot_number=slot_number,
        status=AppointmentStatus.confirmed,
        symptoms_text=data.symptoms_text,
        terms_accepted=data.terms_accepted,
    )
    db.add(appointment)
    await db.flush()

    # Lookup doctor email for notification
    doc_user_res = await db.execute(
        select(User.email)
        .join(Doctor, Doctor.user_id == User.id)
        .where(Doctor.id == session.doctor_id)
    )
    doc_row = doc_user_res.first()
    doctor_email = doc_row[0] if doc_row else ""

    await notif_svc.notify_appointment_booked(
        db=db,
        user_id=current_user.id,
        user_email=current_user.email,
        patient_mobile=getattr(patient, "mobile", None),
        appointment_id=appointment.id,
        doctor_email=doctor_email,
        session_date=str(session.date),
        session_time=session.start_time,
        slot_number=slot_number,
    )

    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.diagnosis),
            selectinload(Appointment.session),
            selectinload(Appointment.doctor),
        )
        .where(Appointment.id == appointment.id)
    )
    return result.scalar_one()


@router.get("/upcoming", response_model=List[AppointmentOut])
async def upcoming_appointments(
    current_user: User = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    pat_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    from datetime import date
    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.diagnosis),
            selectinload(Appointment.session),
            selectinload(Appointment.doctor),
        )
        .join(Session)
        .where(
            Appointment.patient_id == patient.id,
            Appointment.status == AppointmentStatus.confirmed,
            Session.date >= date.today(),
        )
        .order_by(Session.date)
    )
    return result.scalars().all()


@router.get("/history", response_model=List[AppointmentOut])
async def appointment_history(
    current_user: User = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    pat_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = pat_res.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    result = await db.execute(
        select(Appointment)
        .options(
            selectinload(Appointment.diagnosis),
            selectinload(Appointment.session),
            selectinload(Appointment.doctor),
        )
        .join(Session)
        .where(
            Appointment.patient_id == patient.id,
            Appointment.status == AppointmentStatus.completed,
        )
        .order_by(Session.date.desc())
    )
    return result.scalars().all()


@router.delete("/{appointment_id}")
async def cancel_appointment(
    appointment_id: str,
    data: AppointmentCancelRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cancel an appointment. Determines refund eligibility from T&C policy."""
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    # Verify ownership
    if current_user.role == "patient":
        pat_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
        patient = pat_res.scalar_one_or_none()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient profile not found")
        if appt.patient_id != patient.id:
            raise HTTPException(status_code=403, detail="Not your appointment")
    elif current_user.role == "doctor":
        doc_res = await db.execute(select(Doctor).where(Doctor.user_id == current_user.id))
        doctor = doc_res.scalar_one_or_none()
        if appt.doctor_id != doctor.id:
            raise HTTPException(status_code=403, detail="Not your session")

    if appt.status not in [AppointmentStatus.confirmed, AppointmentStatus.pending]:
        raise HTTPException(status_code=400, detail="Appointment cannot be cancelled in current status")

    # T&C: check cancellation window
    sess_res = await db.execute(select(Session).where(Session.id == appt.session_id))
    session = sess_res.scalar_one_or_none()
    from datetime import date as date_type
    session_dt = datetime.combine(session.date, datetime.strptime(session.start_time, "%H:%M:%S").time())
    session_dt = session_dt.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    hours_until = (session_dt - now).total_seconds() / 3600

    if hours_until >= CANCELLATION_FULL_REFUND_HOURS:
        refund_policy = "full_refund"
    elif hours_until > 0:
        refund_policy = "partial_refund"
    else:
        refund_policy = "no_refund"

    appt.status = _get_status_for_cancellation(current_user.role)
    appt.cancellation_reason = data.reason
    appt.cancelled_at = now

    # Resolve the patient's user + mobile for notification (always notify the patient)
    if current_user.role == "patient":
        patient_user_id = current_user.id
        patient_user_email = current_user.email
        patient_mobile = patient.mobile
    else:
        pat_user_res = await db.execute(
            select(User.id, User.email, Patient.mobile)
            .join(Patient, Patient.user_id == User.id)
            .where(Patient.id == appt.patient_id)
        )
        row = pat_user_res.first()
        patient_user_id = row[0] if row else None
        patient_user_email = row[1] if row else None
        patient_mobile = row[2] if row else None

    if patient_user_id and patient_user_email:
        await notif_svc.notify_appointment_cancelled(
            db=db,
            user_id=patient_user_id,
            user_email=patient_user_email,
            patient_mobile=patient_mobile,
            appointment_id=appt.id,
            refund_policy=refund_policy,
            reason=data.reason,
        )

    return {
        "message": "Appointment cancelled",
        "refund_policy": refund_policy,
        "status": appt.status,
    }


@router.post("/{appointment_id}/attachments")
async def upload_attachment(
    appointment_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    """Upload a medical report attachment for an appointment."""
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")

    upload_dir = os.path.join(settings.UPLOAD_DIR, "appointments", appointment_id)
    os.makedirs(upload_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    ext = os.path.splitext(file.filename or "file")[1]
    file_path = os.path.join(upload_dir, f"{file_id}{ext}")

    async with aiofiles.open(file_path, "wb") as f:
        content = await file.read()
        await f.write(content)

    attachment = AppointmentAttachment(
        appointment_id=appointment_id,
        file_path=file_path,
        file_type=file.content_type,
        original_name=file.filename,
    )
    db.add(attachment)
    await db.flush()
    return {"message": "File uploaded", "file_path": file_path}


@router.get("/slots/{session_id}", response_model=List[SlotInfo])
async def get_session_slots(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get all slots for a session with availability status."""
    sess_res = await db.execute(select(Session).where(Session.id == session_id))
    session = sess_res.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    booked_res = await db.execute(
        select(Appointment.slot_number).where(
            Appointment.session_id == session_id,
            Appointment.status.not_in([
                AppointmentStatus.patient_withdrawn,
                AppointmentStatus.doctor_withdrawn,
            ]),
        )
    )
    booked_slots = {row[0] for row in booked_res.fetchall()}

    from datetime import datetime as dt, time as time_type
    start = dt.strptime(session.start_time, "%H:%M:%S")
    slots = []
    for i in range(1, session.max_patients + 1):
        slot_start = start + timedelta(minutes=(i - 1) * session.slot_duration_mins)
        slots.append(SlotInfo(
            slot_number=i,
            start_time=slot_start.strftime("%H:%M"),
            is_available=(i not in booked_slots),
        ))
    return slots
