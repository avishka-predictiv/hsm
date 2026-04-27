import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import String, DateTime, ForeignKey, Numeric, Enum, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.core.database import Base


class PaymentStatus(str, PyEnum):
    pending = "pending"
    success = "success"
    refunded = "refunded"
    partial_refund = "partial_refund"
    failed = "failed"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    appointment_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("appointments.id", ondelete="CASCADE"), unique=True, nullable=False)
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("patients.id"), nullable=False)

    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    method: Mapped[str | None] = mapped_column(String(50), nullable=True)  # "mock", "card", etc.
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.pending)
    transaction_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    receipt_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    appointment = relationship("Appointment", back_populates="payment")
    patient = relationship("Patient", back_populates="payments")


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(30), nullable=False)   # e.g. "card", "bank"
    label: Mapped[str | None] = mapped_column(String(100), nullable=True)  # e.g. "Visa ending 4242"
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    patient = relationship("Patient", back_populates="payment_methods")
