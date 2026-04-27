"""
Seed script: create realistic test data for UI navigation.

Creates:
- Patient + profile (profile_complete=true)
- Multiple doctors (verified + one unverified) with specializations
- Sessions (today + upcoming)
- Appointments (upcoming + completed)
- Diagnoses for completed appointments
- Payments + payment methods
- System settings (terms and cancellation hours)

Run from backend/ directory:
    python seed_test_data.py

Optional:
    python seed_test_data.py --doctors 8 --patients 3 --reset
"""

import argparse
import asyncio
import os
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Iterable

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select, text  # noqa: E402
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker  # noqa: E402
from sqlalchemy.orm import selectinload  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.core.database import Base  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.user import User, UserRole  # noqa: E402
from app.models.patient import Patient  # noqa: E402
from app.models.doctor import Doctor, Specialization, DoctorSchedule  # noqa: E402
from app.models.appointment import Session, SessionStatus, Appointment, AppointmentStatus  # noqa: E402
from app.models.diagnosis import Diagnosis  # noqa: E402
from app.models.payment import Payment, PaymentMethod, PaymentStatus  # noqa: E402
from app.models.audit import NotificationPreference, NotificationChannel, SystemSetting, AdminCredential  # noqa: E402


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _time(h: int, m: int = 0) -> str:
    return f"{h:02d}:{m:02d}:00"


async def _ensure_setting(session, key: str, value: dict):
    existing = await session.get(SystemSetting, key)
    if existing:
        return existing
    s = SystemSetting(key=key, value=value, updated_by=None)
    session.add(s)
    await session.flush()
    return s


async def _ensure_notification_prefs(session, user_id: str):
    for channel, enabled in [(NotificationChannel.email, True), (NotificationChannel.mobile, False)]:
        res = await session.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == user_id,
                NotificationPreference.channel == channel,
            )
        )
        pref = res.scalar_one_or_none()
        if not pref:
            session.add(NotificationPreference(user_id=user_id, channel=channel, enabled=enabled))


async def _get_specs(session, limit: int = 8) -> list[Specialization]:
    res = await session.execute(select(Specialization).order_by(Specialization.id).limit(limit))
    return list(res.scalars().all())


async def _ensure_admin(session):
    """Ensure admin user exists based on settings.ADMIN_EMAIL/ADMIN_PASSWORD."""
    res = await session.execute(select(User).where(User.email == settings.ADMIN_EMAIL))
    user = res.scalar_one_or_none()
    if user:
        return user

    admin_id = str(uuid.uuid4())
    user = User(
        id=admin_id,
        email=settings.ADMIN_EMAIL,
        role=UserRole.admin,
        is_active=True,
        profile_complete=True,
    )
    session.add(user)
    await session.flush()

    cred = AdminCredential(
        id=str(uuid.uuid4()),
        user_id=admin_id,
        password_hash=hash_password(settings.ADMIN_PASSWORD),
    )
    session.add(cred)
    await session.flush()
    return user


async def _ensure_patient(session, idx: int, *, email: str | None = None, password: str | None = None) -> tuple[User, Patient]:
    email = email or f"patient{idx}@example.com"
    nic = f"90{idx:02d}123456V"

    res = await session.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            role=UserRole.patient,
            is_active=True,
            profile_complete=True,
        )
        if password:
            user.password_hash = hash_password(password)
        session.add(user)
        await session.flush()
        await _ensure_notification_prefs(session, user.id)
    else:
        # Ensure user is usable for password login if requested
        if password and not user.password_hash:
            user.password_hash = hash_password(password)
        if not user.is_active:
            user.is_active = True

    res2 = await session.execute(select(Patient).where(Patient.user_id == user.id))
    profile = res2.scalar_one_or_none()
    if not profile:
        profile = Patient(
            id=str(uuid.uuid4()),
            user_id=user.id,
            nic=nic,
            mobile=f"077{idx:07d}"[:10],
            address=f"{10+idx} Galle Road, Colombo",
            dob=date(1990, 1, min(28, 10 + idx)),
            gender="Female" if idx % 2 == 0 else "Male",
            blood_group="O+",
            known_allergies="None" if idx % 2 else "Penicillin",
            chronic_conditions="None",
            emergency_contact_name="Emergency Contact",
            emergency_contact_phone="0770000000",
        )
        session.add(profile)
        await session.flush()

    return user, profile


async def _ensure_doctor(session, idx: int, specs: list[Specialization], verified: bool, *, email: str | None = None, password: str | None = None) -> tuple[User, Doctor]:
    email = email or f"doctor{idx}@example.com"
    nic = f"80{idx:02d}765432V"
    reg = f"SLMC/20{10+idx:02d}/{1000+idx}"

    res = await session.execute(select(User).where(User.email == email))
    user = res.scalar_one_or_none()
    if not user:
        user = User(
            id=str(uuid.uuid4()),
            email=email,
            role=UserRole.doctor,
            is_active=True,
            profile_complete=True,
        )
        if password:
            user.password_hash = hash_password(password)
        session.add(user)
        await session.flush()
        await _ensure_notification_prefs(session, user.id)
    else:
        if password and not user.password_hash:
            user.password_hash = hash_password(password)
        if not user.is_active:
            user.is_active = True

    # IMPORTANT: load specializations eagerly (async sessions can't lazy-load without greenlet)
    res2 = await session.execute(
        select(Doctor)
        .options(selectinload(Doctor.specializations))
        .where(Doctor.user_id == user.id)
    )
    profile = res2.scalar_one_or_none()
    if not profile:
        profile = Doctor(
            id=str(uuid.uuid4()),
            user_id=user.id,
            nic=nic,
            mobile=f"011{idx:07d}"[:10],
            reg_number=reg,
            years_experience=5 + idx,
            qualifications="MBBS, MD",
            consultation_fee=Decimal(2000 + idx * 250),
            affiliation="National Hospital",
            bio="Experienced clinician. This is seeded test data.",
            is_verified=verified,
        )
        # attach 1-2 specializations
        profile.specializations = [specs[idx % len(specs)]]
        if len(specs) > 1 and idx % 2 == 0:
            profile.specializations.append(specs[(idx + 1) % len(specs)])

        session.add(profile)
        await session.flush()
    else:
        # keep specs non-empty and update verification if needed
        profile.is_verified = verified
        if (not profile.specializations) and specs:
            profile.specializations = [specs[idx % len(specs)]]

    return user, profile


async def _ensure_doctor_weekly_schedule(session, doctor_id: str):
    """Ensure a simple Mon-Fri schedule exists for a doctor."""
    existing = await session.execute(select(DoctorSchedule).where(DoctorSchedule.doctor_id == doctor_id))
    if existing.scalars().first():
        return
    for day in ["Mon", "Tue", "Wed", "Thu", "Fri"]:
        session.add(
            DoctorSchedule(
                id=str(uuid.uuid4()),
                doctor_id=doctor_id,
                day_of_week=day,
                start_time="09:00:00",
                end_time="13:00:00",
                slot_duration_mins=15,
                max_patients=12,
                is_active=True,
            )
        )
    await session.flush()


async def _create_session(session, doctor_id: str, d: date, start_h: int, end_h: int, slot_mins: int, max_patients: int, status: SessionStatus):
    s = Session(
        id=str(uuid.uuid4()),
        doctor_id=doctor_id,
        schedule_id=None,
        date=d,
        start_time=_time(start_h, 0),
        end_time=_time(end_h, 0),
        slot_duration_mins=slot_mins,
        max_patients=max_patients,
        status=status,
    )
    session.add(s)
    await session.flush()
    return s


async def _create_appointment(
    session_db,
    patient_id: str,
    doctor_id: str,
    session_id: str,
    slot_number: int,
    status: AppointmentStatus,
    symptoms: str | None,
    terms_accepted: bool = True,
):
    a = Appointment(
        id=str(uuid.uuid4()),
        patient_id=patient_id,
        session_id=session_id,
        doctor_id=doctor_id,
        slot_number=slot_number,
        status=status,
        symptoms_text=symptoms,
        terms_accepted=terms_accepted,
        booked_at=_utc_now() - timedelta(days=2),
    )
    session_db.add(a)
    await session_db.flush()
    return a


async def _create_diagnosis(session_db, appointment_id: str, doctor_id: str):
    d = Diagnosis(
        id=str(uuid.uuid4()),
        appointment_id=appointment_id,
        doctor_id=doctor_id,
        symptoms_observed="Mild symptoms observed on examination.",
        diagnosis="Seeded diagnosis entry (test data).",
        prescription="Paracetamol 500mg PRN (example).",
        follow_up_notes="Follow up in 2 weeks if symptoms persist.",
        next_visit_date=date.today() + timedelta(days=14),
    )
    session_db.add(d)
    await session_db.flush()
    return d


async def _create_payment(session_db, appointment_id: str, patient_id: str, amount: Decimal, status: PaymentStatus):
    p = Payment(
        id=str(uuid.uuid4()),
        appointment_id=appointment_id,
        patient_id=patient_id,
        amount=amount,
        method="mock",
        status=status,
        transaction_ref=f"MOCK-{uuid.uuid4().hex[:12].upper()}",
        paid_at=_utc_now() if status == PaymentStatus.success else None,
    )
    session_db.add(p)
    await session_db.flush()
    return p


async def seed(doctors: int, patients: int, reset: bool):
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncSession = async_sessionmaker(engine, expire_on_commit=False)

    async with AsyncSession() as session:
        if reset:
            # Keep specializations (they are large) and admin creds; wipe operational data
            await session.execute(text("TRUNCATE TABLE payments CASCADE"))
            await session.execute(text("TRUNCATE TABLE payment_methods CASCADE"))
            await session.execute(text("TRUNCATE TABLE diagnoses CASCADE"))
            await session.execute(text("TRUNCATE TABLE appointment_attachments CASCADE"))
            await session.execute(text("TRUNCATE TABLE appointments CASCADE"))
            await session.execute(text("TRUNCATE TABLE sessions CASCADE"))
            await session.execute(text("TRUNCATE TABLE doctor_schedules CASCADE"))
            await session.execute(text("TRUNCATE TABLE doctor_specializations CASCADE"))
            await session.execute(text("TRUNCATE TABLE doctors CASCADE"))
            await session.execute(text("TRUNCATE TABLE patients CASCADE"))
            await session.execute(text("TRUNCATE TABLE notification_preferences CASCADE"))
            # Keep admin user; wipe other users
            await session.execute(text("DELETE FROM users WHERE email != :admin_email"), {"admin_email": settings.ADMIN_EMAIL})
            await session.commit()

        await _ensure_admin(session)

        specs = await _get_specs(session, limit=max(8, doctors * 2))
        if not specs:
            raise RuntimeError("No specializations in DB. Run: python seed_specializations.py")

        # System settings used by UI
        await _ensure_setting(session, "terms_and_conditions", {"text": "Seeded Terms & Conditions (test)."})
        await _ensure_setting(session, "cancellation_policy_hours", {"hours": 24})

        # Create doctors (verified) + one unverified
        doc_profiles: list[Doctor] = []
        for i in range(1, doctors + 1):
            _, d = await _ensure_doctor(session, i, specs, verified=True)
            doc_profiles.append(d)
        # Unverified doctor for admin verification testing
        await _ensure_doctor(session, doctors + 1, specs, verified=False)

        # Create patients
        pat_profiles: list[Patient] = []
        for i in range(1, patients + 1):
            _, p = await _ensure_patient(session, i)
            pat_profiles.append(p)

        # Ensure two "real" test accounts the user can log in with (email+password).
        # These are separate from Google OAuth, so you can test quickly.
        TEST_PASSWORD = "Test1234!"
        _, fixed_doctor = await _ensure_doctor(
            session,
            idx=99,
            specs=specs,
            verified=True,
            email="avishka.prog@gmail.com",
            password=TEST_PASSWORD,
        )
        _, fixed_patient = await _ensure_patient(
            session,
            idx=99,
            email="avishkabro930@gmail.com",
            password=TEST_PASSWORD,
        )
        await _ensure_doctor_weekly_schedule(session, fixed_doctor.id)

        # Sessions: today + upcoming per first 2 doctors
        today = date.today()
        doc_a = doc_profiles[0]
        doc_b = doc_profiles[1] if len(doc_profiles) > 1 else doc_profiles[0]

        sess_today_active = await _create_session(session, doc_a.id, today, 9, 12, 15, 12, SessionStatus.active)
        sess_today_scheduled = await _create_session(session, doc_a.id, today, 14, 17, 20, 9, SessionStatus.scheduled)
        sess_upcoming_1 = await _create_session(session, doc_a.id, today + timedelta(days=3), 9, 12, 15, 12, SessionStatus.scheduled)
        sess_upcoming_2 = await _create_session(session, doc_b.id, today + timedelta(days=5), 14, 17, 20, 9, SessionStatus.scheduled)

        # Sessions for the fixed doctor (these will show in patient "Find Doctors" → availability)
        await _create_session(session, fixed_doctor.id, today + timedelta(days=1), 9, 13, 15, 12, SessionStatus.scheduled)
        await _create_session(session, fixed_doctor.id, today + timedelta(days=2), 9, 13, 15, 12, SessionStatus.scheduled)

        # Appointments for first patient to test UI tabs
        p0 = pat_profiles[0]
        # upcoming
        appt1 = await _create_appointment(
            session,
            patient_id=p0.id,
            doctor_id=doc_a.id,
            session_id=sess_upcoming_1.id,
            slot_number=1,
            status=AppointmentStatus.confirmed,
            symptoms="Chest discomfort and mild breathlessness (seed).",
        )
        # completed (history)
        appt2 = await _create_appointment(
            session,
            patient_id=p0.id,
            doctor_id=doc_b.id,
            session_id=sess_today_active.id,
            slot_number=2,
            status=AppointmentStatus.completed,
            symptoms="Recurring headaches (seed).",
        )
        await _create_diagnosis(session, appt2.id, doc_b.id)

        # Payments + payment methods for first patient
        # Ensure at least one payment method exists
        res_pm = await session.execute(select(PaymentMethod).where(PaymentMethod.patient_id == p0.id))
        existing_pm = res_pm.scalars().first()
        if not existing_pm:
            session.add(PaymentMethod(id=str(uuid.uuid4()), patient_id=p0.id, type="card", label="Visa ending 4242", is_default=True))
            session.add(PaymentMethod(id=str(uuid.uuid4()), patient_id=p0.id, type="mobile", label="Dialog eZ Cash · 0771234567", is_default=False))

        await _create_payment(session, appt1.id, p0.id, Decimal("2500.00"), PaymentStatus.success)
        await _create_payment(session, appt2.id, p0.id, Decimal("3000.00"), PaymentStatus.refunded)

        # One upcoming appointment for the fixed patient with the fixed doctor
        # (uses the "tomorrow" session we just created).
        fixed_sessions = await session.execute(
            select(Session)
            .where(Session.doctor_id == fixed_doctor.id, Session.status == SessionStatus.scheduled)
            .order_by(Session.date)
        )
        first_fixed_session = fixed_sessions.scalars().first()
        if first_fixed_session:
            await _create_appointment(
                session,
                patient_id=fixed_patient.id,
                doctor_id=fixed_doctor.id,
                session_id=first_fixed_session.id,
                slot_number=1,
                status=AppointmentStatus.confirmed,
                symptoms="Seeded test appointment for fixed accounts.",
            )

        await session.commit()

        print("Seeded test data successfully.")
        print(f"- Doctors created/ensured: {doctors} verified (+1 unverified)")
        print(f"- Patients created/ensured: {patients}")
        print("- Sessions created: today(active + scheduled) + upcoming")
        print("- Appointments created: 1 upcoming + 1 completed (with diagnosis)")
        print("- Payments created: success + refunded")
        print()
        print("Login info:")
        print(f"- Admin: {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}  (use /admin-login)")
        print()
        print("Email/password test accounts (UI /login):")
        print(f"- Doctor: avishka.prog@gmail.com / {TEST_PASSWORD}")
        print(f"- Patient: avishkabro930@gmail.com / {TEST_PASSWORD}")
        print("Patients/Doctors can also use Google OAuth in UI if configured.")

    await engine.dispose()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--doctors", type=int, default=6)
    parser.add_argument("--patients", type=int, default=3)
    parser.add_argument("--reset", action="store_true", help="Wipe operational tables before seeding (keeps specializations).")
    args = parser.parse_args()

    asyncio.run(seed(doctors=args.doctors, patients=args.patients, reset=args.reset))


if __name__ == "__main__":
    main()

