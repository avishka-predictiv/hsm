from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_db
from app.schemas.doctor import SpecializationOut
from app.models.doctor import Specialization

router = APIRouter(prefix="/specializations", tags=["Specializations"])


@router.get("", response_model=List[SpecializationOut])
async def list_specializations(db: AsyncSession = Depends(get_db)):
    """Public: return all specializations from database."""
    result = await db.execute(select(Specialization).order_by(Specialization.name))
    return result.scalars().all()
