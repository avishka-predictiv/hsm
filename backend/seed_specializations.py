"""
Seed script: loads all specializations from the specialization JSON file into PostgreSQL.
Run from backend/ directory:
    python seed_specializations.py
"""
import asyncio
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import text
from app.core.config import settings
from app.models.doctor import Specialization
from app.core.database import Base


SPEC_FILE = os.path.join(os.path.dirname(__file__), "..", "specialization")


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncSession = async_sessionmaker(engine, expire_on_commit=False)

    with open(SPEC_FILE, "r", encoding="utf-8") as f:
        specs = json.load(f)

    async with AsyncSession() as session:
        # Check if already seeded
        result = await session.execute(text("SELECT COUNT(*) FROM specializations"))
        count = result.scalar()
        if count > 0:
            print(f"Already seeded: {count} specializations exist. Skipping.")
            return

        for code, name in specs.items():
            spec = Specialization(code=code, name=name.strip())
            session.add(spec)

        await session.commit()
        print(f"Seeded {len(specs)} specializations successfully.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
