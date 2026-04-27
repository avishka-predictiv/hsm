# Import all models here so Alembic can discover them
from app.models.user import User, UserRole
from app.models.patient import Patient
from app.models.doctor import Doctor, Specialization, DoctorSchedule, doctor_specializations
from app.models.appointment import Session, Appointment, AppointmentAttachment, SessionStatus, AppointmentStatus
from app.models.diagnosis import Diagnosis
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.audit import (
    Notification,
    NotificationPreference,
    NotificationChannel,
    AdminCredential,
    AuditLog,
    SystemSetting,
)

__all__ = [
    "User", "UserRole",
    "Patient",
    "Doctor", "Specialization", "DoctorSchedule", "doctor_specializations",
    "Session", "Appointment", "AppointmentAttachment", "SessionStatus", "AppointmentStatus",
    "Diagnosis",
    "Payment", "PaymentMethod", "PaymentStatus",
    "Notification", "NotificationPreference", "NotificationChannel",
    "AdminCredential", "AuditLog", "SystemSetting",
]
