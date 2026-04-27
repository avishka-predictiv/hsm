from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum


class PaymentStatusEnum(str, Enum):
    pending = "pending"
    success = "success"
    refunded = "refunded"
    partial_refund = "partial_refund"
    failed = "failed"


class PaymentCreate(BaseModel):
    appointment_id: str
    amount: float
    method: Optional[str] = "mock"
    payment_method_id: Optional[str] = None


class PaymentOut(BaseModel):
    id: str
    appointment_id: str
    patient_id: str
    amount: float
    method: Optional[str]
    status: PaymentStatusEnum
    transaction_ref: Optional[str] = None
    receipt_path: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class PaymentMethodCreate(BaseModel):
    type: str
    label: Optional[str] = None
    is_default: bool = False


class PaymentMethodOut(BaseModel):
    id: str
    patient_id: str
    type: str
    label: Optional[str] = None
    is_default: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationPrefUpdate(BaseModel):
    email: bool = True
    mobile: bool = False
