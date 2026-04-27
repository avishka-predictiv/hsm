from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime, timezone
import uuid

from app.core.database import get_db
from app.core.security import require_role
from app.models.user import User
from app.models.patient import Patient
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.schemas.payment import PaymentCreate, PaymentOut, PaymentMethodCreate, PaymentMethodOut

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("", response_model=PaymentOut)
async def create_payment(
    data: PaymentCreate,
    current_user: User = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    """Mock payment creation — marks payment as success immediately."""
    pat_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = pat_res.scalar_one_or_none()

    payment = Payment(
        id=str(uuid.uuid4()),
        appointment_id=data.appointment_id,
        patient_id=patient.id,
        amount=data.amount,
        method=data.method or "mock",
        status=PaymentStatus.success,   # Mock: instant success
        transaction_ref=f"MOCK-{uuid.uuid4().hex[:12].upper()}",
        paid_at=datetime.now(timezone.utc),
    )
    db.add(payment)
    await db.flush()
    return payment


@router.get("/history", response_model=List[PaymentOut])
async def payment_history(
    current_user: User = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    pat_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = pat_res.scalar_one_or_none()
    result = await db.execute(
        select(Payment).where(Payment.patient_id == patient.id).order_by(Payment.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{payment_id}/receipt")
async def generate_receipt(
    payment_id: str,
    current_user: User = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    """Receipt generation placeholder — button exists, PDF impl comes later."""
    result = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return {
        "message": "Receipt generation will be available soon",
        "payment_id": payment_id,
        "amount": float(payment.amount),
        "transaction_ref": payment.transaction_ref,
        "status": payment.status,
    }


# Payment Methods
@router.get("/methods", response_model=List[PaymentMethodOut])
async def list_payment_methods(
    current_user: User = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    pat_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = pat_res.scalar_one_or_none()
    result = await db.execute(select(PaymentMethod).where(PaymentMethod.patient_id == patient.id))
    return result.scalars().all()


@router.post("/methods", response_model=PaymentMethodOut)
async def add_payment_method(
    data: PaymentMethodCreate,
    current_user: User = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    pat_res = await db.execute(select(Patient).where(Patient.user_id == current_user.id))
    patient = pat_res.scalar_one_or_none()

    if data.is_default:
        # Unset existing default
        existing = await db.execute(
            select(PaymentMethod).where(PaymentMethod.patient_id == patient.id, PaymentMethod.is_default == True)  # noqa
        )
        for pm in existing.scalars().all():
            pm.is_default = False

    method = PaymentMethod(id=str(uuid.uuid4()), patient_id=patient.id, **data.model_dump())
    db.add(method)
    await db.flush()
    return method


@router.delete("/methods/{method_id}")
async def delete_payment_method(
    method_id: str,
    current_user: User = Depends(require_role("patient")),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(PaymentMethod).where(PaymentMethod.id == method_id))
    method = result.scalar_one_or_none()
    if not method:
        raise HTTPException(status_code=404, detail="Payment method not found")
    await db.delete(method)
    return {"message": "Payment method removed"}
