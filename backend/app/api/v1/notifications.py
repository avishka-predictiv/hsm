from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.audit import Notification
from app.schemas.notification import NotificationOut
from app.core.config import settings

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("/test-sms")
async def test_sms(to: str = Query(..., description="Mobile number to send test SMS to")):
    """
    Diagnostic endpoint — sends a test SMS and reports exactly what happened.
    Open in browser: http://localhost:8000/api/v1/notifications/test-sms?to=0771234567
    """
    import asyncio, re

    def normalise(mobile: str):
        digits = re.sub(r"\D", "", mobile)
        if digits.startswith("94") and len(digits) == 11:
            return f"+{digits}"
        if digits.startswith("0") and len(digits) == 10:
            return f"+94{digits[1:]}"
        if len(digits) == 9:
            return f"+94{digits}"
        return None

    report = {
        "twilio_sid_loaded": bool(settings.TWILIO_ACCOUNT_SID),
        "twilio_token_loaded": bool(settings.TWILIO_AUTH_TOKEN),
        "twilio_from_number": settings.TWILIO_FROM_NUMBER or "(not set)",
        "input_number": to,
        "normalised_number": normalise(to),
        "sms_sent": False,
        "sms_sid": None,
        "sms_status": None,
        "error": None,
    }

    if not report["twilio_sid_loaded"] or not report["twilio_token_loaded"] or not settings.TWILIO_FROM_NUMBER:
        report["error"] = "Twilio credentials missing — restart the backend after editing .env"
        return report

    if not report["normalised_number"]:
        report["error"] = f"Could not normalise {to!r} to E.164. Expected formats: 0771234567 / 771234567 / +94771234567"
        return report

    def _do_send():
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        return client.messages.create(
            body="[HMS] Test SMS — if you see this, Twilio is working correctly.",
            from_=settings.TWILIO_FROM_NUMBER,
            to=report["normalised_number"],
        )

    try:
        msg = await asyncio.to_thread(_do_send)
        report["sms_sent"] = True
        report["sms_sid"] = msg.sid
        report["sms_status"] = msg.status
    except Exception as exc:
        report["error"] = str(exc)

    return report


@router.get("/test-email")
async def test_email(to: str = Query(..., description="Email address to send test email to")):
    """
    Diagnostic endpoint — sends a test email and reports exactly what happened.
    Open in browser: http://localhost:8000/api/v1/notifications/test-email?to=you@gmail.com
    """
    report = {
        "mail_username_loaded": bool(settings.MAIL_USERNAME and "your-email" not in settings.MAIL_USERNAME),
        "mail_from": settings.MAIL_FROM or "(not set)",
        "mail_server": f"{settings.MAIL_SERVER}:{settings.MAIL_PORT}",
        "recipient": to,
        "email_sent": False,
        "error": None,
    }

    if not report["mail_username_loaded"]:
        report["error"] = "Email not configured — set MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM in .env and restart the backend"
        return report

    try:
        from fastapi_mail import FastMail, MessageSchema, ConnectionConfig, MessageType
        conf = ConnectionConfig(
            MAIL_USERNAME=settings.MAIL_USERNAME,
            MAIL_PASSWORD=settings.MAIL_PASSWORD,
            MAIL_FROM=settings.MAIL_FROM,
            MAIL_PORT=settings.MAIL_PORT,
            MAIL_SERVER=settings.MAIL_SERVER,
            MAIL_STARTTLS=settings.MAIL_TLS,
            MAIL_SSL_TLS=settings.MAIL_SSL,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True,
        )
        fm = FastMail(conf)
        msg = MessageSchema(
            subject="HMS — Test Email",
            recipients=[to],
            body="""
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
              <h2 style="color:#1a7fe6;margin-top:0">&#x2705; Email is working!</h2>
              <p>If you received this, your HMS email notification system is configured correctly.</p>
              <hr style="border:none;border-top:1px solid #e5e9f0;margin:20px 0"/>
              <p style="color:#94a3b8;font-size:12px;margin:0">Hospital Management System</p>
            </div>
            """,
            subtype=MessageType.html,
        )
        await fm.send_message(msg)
        report["email_sent"] = True
    except Exception as exc:
        report["error"] = str(exc)

    return report


@router.get("", response_model=List[NotificationOut])
async def list_notifications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(Notification.sent_at.desc())
        .limit(50)
    )
    return result.scalars().all()


@router.get("/unread-count")
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,  # noqa: E712
        )
    )
    return {"count": result.scalar() or 0}


@router.put("/read-all")
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read == False,  # noqa: E712
        )
        .values(is_read=True)
    )
    return {"message": "All notifications marked as read"}


@router.put("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(Notification)
        .where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
        .values(is_read=True)
    )
    return {"message": "Marked as read"}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if notif:
        await db.delete(notif)
    return {"message": "Deleted"}
