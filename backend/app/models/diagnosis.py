import uuid
from datetime import datetime, date, timezone
from sqlalchemy import String, Date, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    appointment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("appointments.id", ondelete="CASCADE"), unique=True, nullable=False)
    doctor_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("doctors.id"), nullable=False)

    symptoms_observed: Mapped[str | None] = mapped_column(Text, nullable=True)
    diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    prescription: Mapped[str | None] = mapped_column(Text, nullable=True)
    follow_up_notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Doctor-recommended next visit date (per user's requirement)
    next_visit_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # AI summary placeholder — populated later
    ai_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    ai_generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # MedReasoner (CliniqReason) saved chat diagnosis output and the chat session id
    medreasoner_diagnosis: Mapped[str | None] = mapped_column(Text, nullable=True)
    medreasoner_session_id: Mapped[str | None] = mapped_column(String(64), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    appointment = relationship("Appointment", back_populates="diagnosis")
    doctor = relationship("Doctor", back_populates="diagnoses")
