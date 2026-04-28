import uuid
import asyncio
import logging
import re
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

logger = logging.getLogger(__name__)


def _normalise_mobile(mobile: str) -> str | None:
    """Convert a Sri Lankan mobile number to E.164 (+94XXXXXXXXX)."""
    digits = re.sub(r"\D", "", mobile)
    if digits.startswith("94") and len(digits) == 11:
        return f"+{digits}"
    if digits.startswith("0") and len(digits) == 10:
        return f"+94{digits[1:]}"
    if len(digits) == 9:
        return f"+94{digits}"
    return None  # unrecognised format — skip SMS


async def _get_pref(db: AsyncSession, user_id: str, channel) -> bool:
    from app.models.audit import NotificationPreference
    result = await db.execute(
        select(NotificationPreference).where(
            NotificationPreference.user_id == user_id,
            NotificationPreference.channel == channel,
        )
    )
    pref = result.scalar_one_or_none()
    return pref.enabled if pref else True   # default enabled


async def _store(db: AsyncSession, user_id: str, type_: str, title: str, message: str) -> None:
    from app.models.audit import Notification
    db.add(Notification(
        id=str(uuid.uuid4()),
        user_id=user_id,
        type=type_,
        title=title,
        message=message,
        channel="app",
        is_read=False,
        sent_at=datetime.now(timezone.utc),
    ))


async def _send_email(to_email: str, subject: str, html_body: str) -> None:
    from app.core.config import settings
    if not settings.MAIL_USERNAME or "your-email" in settings.MAIL_USERNAME:
        logger.info("[NOTIF] Email not configured — skipping (%s)", subject)
        return
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
            subject=subject,
            recipients=[to_email],
            body=html_body,
            subtype=MessageType.html,
        )
        await fm.send_message(msg)
        logger.info("[NOTIF] Email sent: %s → %s", subject, to_email)
    except Exception as exc:
        logger.error("[NOTIF] Email send failed: %s", exc)


async def _send_sms(to_mobile: str, body: str) -> None:
    from app.core.config import settings

    sid = settings.TWILIO_ACCOUNT_SID
    token = settings.TWILIO_AUTH_TOKEN
    from_number = settings.TWILIO_FROM_NUMBER

    if not sid or not token or not from_number:
        print("[NOTIF] Twilio credentials not loaded — restart the backend after editing .env")
        return

    number = _normalise_mobile(to_mobile)
    if not number:
        print(f"[NOTIF] Could not normalise mobile {to_mobile!r} — skipping SMS")
        return

    print(f"[NOTIF] Sending SMS → {number}  (SID={sid[:8]}...)")

    def _do_send():
        from twilio.rest import Client
        client = Client(sid, token)
        return client.messages.create(body=body, from_=from_number, to=number)

    try:
        # Run the synchronous Twilio call in a thread so it doesn't block the event loop
        msg = await asyncio.to_thread(_do_send)
        print(f"[NOTIF] SMS sent OK — SID={msg.sid}  status={msg.status}")
    except Exception as exc:
        print(f"[NOTIF] SMS send FAILED: {exc}")


async def notify_appointment_booked(
    db: AsyncSession,
    user_id: str,
    user_email: str,
    patient_mobile: str | None,
    appointment_id: str,
    doctor_email: str,
    session_date: str,
    session_time: str,
    slot_number: int,
) -> None:
    from app.models.audit import NotificationChannel
    doctor_name = doctor_email.split("@")[0]
    title = "Appointment Confirmed"
    message = (
        f"Your appointment with Dr. {doctor_name} is confirmed for "
        f"{session_date} at {session_time[:5]}. You are slot #{slot_number}."
    )

    await _store(db, user_id, "appointment_booked", title, message)

    if await _get_pref(db, user_id, NotificationChannel.email):
        patient_name = user_email.split("@")[0].replace(".", " ").title()
        short_id = appointment_id[-10:].upper()
        await _send_email(
            user_email,
            f"Appointment Confirmed — #{short_id} | HMS",
            f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:'Segoe UI',Arial,sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:40px 16px;">
    <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#1a7fe6,#0c4f9e);border-radius:14px 14px 0 0;padding:32px 36px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">HMS</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.75);margin-top:4px;letter-spacing:1px;text-transform:uppercase;">Hospital Management System</div>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="background:#ffffff;padding:36px;border-left:1px solid #e5e9f0;border-right:1px solid #e5e9f0;">

          <!-- Thank you message -->
          <div style="text-align:center;margin-bottom:28px;">
            <div style="font-size:44px;margin-bottom:8px;">&#x1F3E5;</div>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#0f172a;">
              Thank You for Booking!
            </h1>
            <p style="margin:8px 0 0;font-size:15px;color:#475569;line-height:1.6;">
              Dear <strong>{patient_name}</strong>, your appointment has been
              confirmed. Please find your booking details below.
            </p>
          </div>

          <!-- Appointment details card -->
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f0f7ff;border:1px solid #bbdcfd;border-radius:12px;margin-bottom:28px;">
            <tr>
              <td style="padding:24px 28px;">
                <div style="font-size:11px;font-weight:700;color:#1a7fe6;text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;">
                  Appointment Details
                </div>

                <!-- Appointment No -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
                  <tr>
                    <td style="font-size:13px;color:#64748b;width:160px;">Appointment No.</td>
                    <td style="font-size:14px;font-weight:700;color:#0f172a;font-family:monospace;
                               background:#1a7fe6;color:#fff;padding:3px 10px;border-radius:6px;
                               display:inline-block;letter-spacing:1px;">#{short_id}</td>
                  </tr>
                </table>

                <div style="border-top:1px solid #bbdcfd;margin:12px 0;"></div>

                <!-- Doctor -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                  <tr>
                    <td style="font-size:13px;color:#64748b;width:160px;">Doctor</td>
                    <td style="font-size:14px;font-weight:600;color:#0f172a;">Dr. {doctor_name.replace(".", " ").title()}</td>
                  </tr>
                </table>

                <!-- Date -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                  <tr>
                    <td style="font-size:13px;color:#64748b;width:160px;">Date</td>
                    <td style="font-size:14px;font-weight:600;color:#0f172a;">{session_date}</td>
                  </tr>
                </table>

                <!-- Time -->
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                  <tr>
                    <td style="font-size:13px;color:#64748b;width:160px;">Time</td>
                    <td style="font-size:14px;font-weight:600;color:#0f172a;">{session_time[:5]}</td>
                  </tr>
                </table>

                <!-- Slot -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:13px;color:#64748b;width:160px;">Queue Slot</td>
                    <td style="font-size:14px;font-weight:600;color:#0f172a;">#{slot_number}</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- What to bring -->
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#f8fafc;border:1px solid #e5e9f0;border-radius:12px;margin-bottom:28px;">
            <tr>
              <td style="padding:20px 24px;">
                <div style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:10px;">
                  &#x1F4CB; What to bring
                </div>
                <ul style="margin:0;padding-left:18px;font-size:13px;color:#475569;line-height:2;">
                  <li>National Identity Card (NIC)</li>
                  <li>Previous medical records or prescriptions (if any)</li>
                  <li>Payment receipt (if payment was made online)</li>
                  <li>Arrive 10 minutes before your slot time</li>
                </ul>
              </td>
            </tr>
          </table>

          <!-- Cancellation note -->
          <table width="100%" cellpadding="0" cellspacing="0"
                 style="background:#fff8f0;border:1px solid #fed7aa;border-radius:12px;margin-bottom:8px;">
            <tr>
              <td style="padding:16px 20px;">
                <div style="font-size:13px;color:#92400e;line-height:1.6;">
                  &#x26A0;&#xFE0F; <strong>Cancellation Policy:</strong>
                  Cancel at least <strong>24 hours</strong> before your appointment
                  for a full refund. Cancellations within 24 hours may be subject to
                  a partial refund or no refund.
                </div>
              </td>
            </tr>
          </table>

        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:#f8fafc;border:1px solid #e5e9f0;border-top:none;
                   border-radius:0 0 14px 14px;padding:20px 36px;text-align:center;">
          <p style="margin:0 0 6px;font-size:12px;color:#94a3b8;">
            Need help? Contact us through the HMS patient portal.
          </p>
          <p style="margin:0;font-size:11px;color:#cbd5e1;">
            &copy; 2026 Hospital Management System. All rights reserved.
          </p>
        </td>
      </tr>

    </table>
    </td></tr>
  </table>

</body>
</html>""",
        )

    if patient_mobile and await _get_pref(db, user_id, NotificationChannel.mobile):
        await _send_sms(
            patient_mobile,
            f"[HMS] Appointment confirmed with Dr. {doctor_name} on {session_date} at {session_time[:5]}. Slot #{slot_number}. ID: {appointment_id[-8:]}",
        )


async def notify_appointment_cancelled(
    db: AsyncSession,
    user_id: str,
    user_email: str,
    patient_mobile: str | None,
    appointment_id: str,
    refund_policy: str,
    reason: str | None = None,
) -> None:
    from app.models.audit import NotificationChannel
    refund_labels = {
        "full_refund": "A full refund will be processed.",
        "partial_refund": "A partial refund will be processed.",
        "no_refund": "No refund is applicable per the cancellation policy.",
    }
    title = "Appointment Cancelled"
    message = f"Your appointment has been cancelled. {refund_labels.get(refund_policy, '')}"
    if reason:
        message += f" Reason: {reason}"

    await _store(db, user_id, "appointment_cancelled", title, message)

    if await _get_pref(db, user_id, NotificationChannel.email):
        await _send_email(
            user_email,
            f"HMS — {title}",
            f"""
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
              <h2 style="color:#f43f5e;margin-top:0">&#x274C; Appointment Cancelled</h2>
              <p style="font-size:15px;line-height:1.6">{message}</p>
              <p style="color:#94a3b8;font-size:12px">Appointment ID: {appointment_id}</p>
              <hr style="border:none;border-top:1px solid #e5e9f0;margin:20px 0"/>
              <p style="color:#94a3b8;font-size:12px;margin:0">Hospital Management System</p>
            </div>
            """,
        )

    if patient_mobile and await _get_pref(db, user_id, NotificationChannel.mobile):
        refund_short = {"full_refund": "Full refund.", "partial_refund": "Partial refund.", "no_refund": "No refund."}.get(refund_policy, "")
        await _send_sms(
            patient_mobile,
            f"[HMS] Your appointment has been cancelled. {refund_short} ID: {appointment_id[-8:]}",
        )
