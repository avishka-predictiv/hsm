import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, ForeignKey, Text, Boolean, Numeric, Integer, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


# Many-to-many: doctors <-> specializations
doctor_specializations = Table(
    "doctor_specializations",
    Base.metadata,
    Column("doctor_id", UUID(as_uuid=False), ForeignKey("doctors.id", ondelete="CASCADE"), primary_key=True),
    Column("specialization_id", Integer, ForeignKey("specializations.id", ondelete="CASCADE"), primary_key=True),
)


class Doctor(Base):
    __tablename__ = "doctors"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Mandatory signup fields
    nic: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    mobile: Mapped[str] = mapped_column(String(20), nullable=False)
    reg_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)

    # Additional profile fields
    years_experience: Mapped[int | None] = mapped_column(Integer, nullable=True)
    qualifications: Mapped[str | None] = mapped_column(Text, nullable=True)
    consultation_fee: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    affiliation: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="doctor_profile")
    specializations = relationship("Specialization", secondary=doctor_specializations, back_populates="doctors")
    schedules = relationship("DoctorSchedule", back_populates="doctor", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="doctor", cascade="all, delete-orphan")
    diagnoses = relationship("Diagnosis", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")


class Specialization(Base):
    __tablename__ = "specializations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)

    # Relationships
    doctors = relationship("Doctor", secondary=doctor_specializations, back_populates="specializations")


class DoctorSchedule(Base):
    __tablename__ = "doctor_schedules"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    doctor_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False)
    day_of_week: Mapped[str] = mapped_column(String(10), nullable=False)   # Mon, Tue, ...
    start_time: Mapped[str] = mapped_column(String(8), nullable=False)     # HH:MM:SS
    end_time: Mapped[str] = mapped_column(String(8), nullable=False)
    slot_duration_mins: Mapped[int] = mapped_column(Integer, default=15)
    max_patients: Mapped[int] = mapped_column(Integer, default=20)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    doctor = relationship("Doctor", back_populates="schedules")
    sessions = relationship("Session", back_populates="schedule")
