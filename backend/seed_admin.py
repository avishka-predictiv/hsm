"""
Seed script: creates the default admin account.
Run from backend/ directory:
    python seed_admin.py
"""
import asyncio
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy import select
from app.core.config import settings
from app.core.security import hash_password
from app.core.database import Base
from app.models.user import User, UserRole
from app.models.audit import AdminCredential


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    AsyncSession = async_sessionmaker(engine, expire_on_commit=False)

    async with AsyncSession() as session:
        result = await session.execute(
            select(User).where(User.email == settings.ADMIN_EMAIL)
        )
        existing = result.scalar_one_or_none()
        if existing:
            # Ensure the admin can actually log in
            changed = False
            if not existing.is_active:
                existing.is_active = True
                changed = True
            if not existing.profile_complete:
                existing.profile_complete = True
                changed = True
            if changed:
                await session.commit()
                print(f"Admin re-activated: {settings.ADMIN_EMAIL}")
            else:
                print(f"Admin already exists: {settings.ADMIN_EMAIL}")
            return

        admin_id = str(uuid.uuid4())
        user = User(
            id=admin_id,
            email=settings.ADMIN_EMAIL,
            role=UserRole.admin,
            is_active=True,
            profile_complete=True,
        )
        session.add(user)
        await session.flush()

        cred = AdminCredential(
            id=str(uuid.uuid4()),
            user_id=admin_id,
            password_hash=hash_password(settings.ADMIN_PASSWORD),
        )
        session.add(cred)
        await session.commit()
        print(f"Admin created: {settings.ADMIN_EMAIL} / {settings.ADMIN_PASSWORD}")
        print("IMPORTANT: Change the admin password after first login!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
