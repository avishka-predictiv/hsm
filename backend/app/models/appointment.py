import uuid
from datetime import datetime, date, timezone
from enum import Enum as PyEnum
from sqlalchemy import String, Date, DateTime, ForeignKey, Text, Boolean, Integer, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class SessionStatus(str, PyEnum):
    scheduled = "scheduled"
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class AppointmentStatus(str, PyEnum):
    pending = "pending"
    confirmed = "confirmed"
    completed = "completed"
    # Cancellation states (incorporating user's requirement)
    doctor_withdrawn = "doctor_withdrawn"
    patient_withdrawn = "patient_withdrawn"
    doctor_absent = "doctor_absent"
    patient_absent = "patient_absent"


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    doctor_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    schedule_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("doctor_schedules.id"), nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[str] = mapped_column(String(8), nullable=False)
    end_time: Mapped[str] = mapped_column(String(8), nullable=False)
    slot_duration_mins: Mapped[int] = mapped_column(Integer, default=15)
    max_patients: Mapped[int] = mapped_column(Integer, default=20)
    status: Mapped[SessionStatus] = mapped_column(Enum(SessionStatus), default=SessionStatus.scheduled)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    doctor = relationship("Doctor", back_populates="sessions")
    schedule = relationship("DoctorSchedule", back_populates="sessions")
    appointments = relationship("Appointment", back_populates="session", cascade="all, delete-orphan")


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    session_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    # Doctor FK directly on appointment (per user's requirement)
    doctor_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("doctors.id"), nullable=False)

    slot_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(Enum(AppointmentStatus), default=AppointmentStatus.pending)

    # Cancellation (no separate table — unified in appointment)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Booking metadata
    booked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    symptoms_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    terms_accepted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    patient = relationship("Patient", back_populates="appointments")
    session = relationship("Session", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    attachments = relationship("AppointmentAttachment", back_populates="appointment", cascade="all, delete-orphan")
    diagnosis = relationship("Diagnosis", back_populates="appointment", uselist=False, cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="appointment", uselist=False, cascade="all, delete-orphan")


class AppointmentAttachment(Base):
    __tablename__ = "appointment_attachments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    appointment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    file_type: Mapped[str] = mapped_column(String(50), nullable=True)
    original_name: Mapped[str] = mapped_column(String(255), nullable=True)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    appointment = relationship("Appointment", back_populates="attachments")
