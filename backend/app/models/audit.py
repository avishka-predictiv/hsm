import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum
from sqlalchemy import String, DateTime, ForeignKey, Text, Boolean, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class NotificationChannel(str, PyEnum):
    email = "email"
    mobile = "mobile"   # SMS / push


class NotificationPreference(Base):
    """Per-user, per-channel notification opt-in (user selects which channels they want)."""
    __tablename__ = "notification_preferences"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    channel: Mapped[NotificationChannel] = mapped_column(Enum(NotificationChannel), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="notification_preferences")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # appointment_booked, payment_success, etc.
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    channel: Mapped[str | None] = mapped_column(String(20), nullable=True)  # which channel was used
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    user = relationship("User", back_populates="notifications")


class AdminCredential(Base):
    __tablename__ = "admin_credentials"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)

    # Relationships
    user = relationship("User", back_populates="admin_credential")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    actor_id: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    target_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    target_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    ip_address: Mapped[str | None] = mapped_column(String(50), nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    actor = relationship("User", back_populates="audit_logs", foreign_keys=[actor_id])


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(100), primary_key=True)
    value: Mapped[dict] = mapped_column(JSONB, nullable=False)
    updated_by: Mapped[str | None] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
