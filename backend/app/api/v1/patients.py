from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.models.user import User
from app.models.patient import Patient
from app.schemas.patient import PatientProfileUpdate, PatientOut
from app.schemas.payment import NotificationPrefUpdate
from app.models.audit import NotificationPreference, NotificationChannel

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("/profile/me", response_model=PatientOut)
async def get_my_profile(
    current_user: User = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Profile not found")
    return patient


@router.put("/profile/me", response_model=PatientOut)
async def update_my_profile(
    data: PatientProfileUpdate,
    current_user: User = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise HTTPException(status_code=404, detail="Profile not found")
    for k, v in data.model_dump(exclude_unset=True).items():
        setattr(patient, k, v)
    return patient


@router.get("/notification-preferences")
async def get_notification_prefs(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get notification channel preferences (email, mobile) for any user."""
    result = await db.execute(
        select(NotificationPreference).where(NotificationPreference.user_id == current_user.id)
    )
    prefs = result.scalars().all()
    return {p.channel: p.enabled for p in prefs}


@router.put("/notification-preferences")
async def update_notification_prefs(
    data: NotificationPrefUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update notification channel preferences."""
    channel_map = {
        NotificationChannel.email: data.email,
        NotificationChannel.mobile: data.mobile,
    }
    for channel, enabled in channel_map.items():
        result = await db.execute(
            select(NotificationPreference).where(
                NotificationPreference.user_id == current_user.id,
                NotificationPreference.channel == channel,
            )
        )
        pref = result.scalar_one_or_none()
        if pref:
            pref.enabled = enabled
        else:
            pref = NotificationPreference(user_id=current_user.id, channel=channel, enabled=enabled)
            db.add(pref)
    return {"message": "Preferences updated"}
