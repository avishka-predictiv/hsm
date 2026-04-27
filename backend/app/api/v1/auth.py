from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from authlib.integrations.starlette_client import OAuth
import httpx, uuid
from datetime import timezone, datetime

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token, create_refresh_token,
    decode_token, hash_password, verify_password, get_current_user,
)
from app.models.user import User, UserRole
from app.models.audit import AdminCredential
from app.schemas.auth import TokenResponse, AdminLoginRequest, RefreshRequest, UserOut, UserRegisterRequest, UserLoginRequest
from app.schemas.patient import PatientProfileCreate
from app.schemas.doctor import DoctorProfileCreate
from app.models.patient import Patient
from app.models.doctor import Doctor, Specialization

router = APIRouter(prefix="/auth", tags=["Authentication"])

oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@router.get("/google")
async def google_login(request: Request, role: str = "patient"):
    """Redirect to Google OAuth. Pass ?role=patient or ?role=doctor"""
    request.session["oauth_role"] = role
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback. Create/upsert user, return JWT."""
    try:
        token = await oauth.google.authorize_access_token(request)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth error: {str(e)}")

    google_user = token.get("userinfo")
    if not google_user:
        raise HTTPException(status_code=400, detail="Could not fetch user info from Google")

    google_id = google_user["sub"]
    email = google_user["email"]
    role_str = request.session.get("oauth_role", "patient")

    # Validate role — admins cannot use Google OAuth
    if role_str == "admin":
        raise HTTPException(status_code=403, detail="Admins must use the admin login endpoint")
    role = UserRole(role_str)

    # Upsert user
    result = await db.execute(select(User).where(User.google_id == google_id))
    user = result.scalar_one_or_none()

    if not user:
        # Check if email already registered
        result2 = await db.execute(select(User).where(User.email == email))
        user = result2.scalar_one_or_none()

    if not user:
        user = User(
            id=str(uuid.uuid4()),
            google_id=google_id,
            email=email,
            role=role,
            is_active=True,
            profile_complete=False,
        )
        db.add(user)
        await db.flush()
    else:
        if not user.google_id:
            user.google_id = google_id

    access_token = create_access_token({"sub": user.id, "role": user.role})
    refresh_token = create_refresh_token({"sub": user.id, "role": user.role})

    # Redirect to frontend with tokens
    frontend_url = (
        f"{settings.FRONTEND_URL}/auth/callback"
        f"?access_token={access_token}&refresh_token={refresh_token}"
        f"&profile_complete={str(user.profile_complete).lower()}&role={user.role}"
    )
    return RedirectResponse(frontend_url)


@router.post("/complete-profile/patient")
async def complete_patient_profile(
    data: PatientProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.patient:
        raise HTTPException(status_code=403, detail="Not a patient account")
    if current_user.profile_complete:
        raise HTTPException(status_code=400, detail="Profile already complete")

    patient = Patient(user_id=current_user.id, **data.model_dump())
    db.add(patient)
    current_user.profile_complete = True
    # Flush so uniqueness/constraint errors happen before returning success.
    await db.flush()
    return {"message": "Patient profile created successfully"}


@router.post("/complete-profile/doctor")
async def complete_doctor_profile(
    data: DoctorProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.role != UserRole.doctor:
        raise HTTPException(status_code=403, detail="Not a doctor account")
    if current_user.profile_complete:
        raise HTTPException(status_code=400, detail="Profile already complete")

    spec_ids = data.specialization_ids
    doctor_data = data.model_dump(exclude={"specialization_ids"})
    doctor = Doctor(user_id=current_user.id, **doctor_data)

    # Attach specializations
    specs = await db.execute(
        select(Specialization).where(Specialization.id.in_(spec_ids))
    )
    doctor.specializations = list(specs.scalars().all())
    db.add(doctor)
    current_user.profile_complete = True
    # Flush so uniqueness/constraint errors happen before returning success.
    await db.flush()
    return {"message": "Doctor profile created successfully"}


@router.post("/admin/login", response_model=TokenResponse)
async def admin_login(data: AdminLoginRequest, db: AsyncSession = Depends(get_db)):
    """Separate, non-public admin login endpoint."""
    result = await db.execute(select(User).where(User.email == data.email, User.role == UserRole.admin))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    cred_result = await db.execute(select(AdminCredential).where(AdminCredential.user_id == user.id))
    cred = cred_result.scalar_one_or_none()
    if not cred or not verify_password(data.password, cred.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": user.id, "role": user.role})
    refresh_token = create_refresh_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


@router.post("/refresh")
async def refresh_tokens(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access_token = create_access_token({"sub": user.id, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/register", response_model=TokenResponse)
async def register(data: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    # Admin accounts must be seeded and use the admin login endpoint.
    if data.role == UserRole.admin:
        raise HTTPException(status_code=403, detail="Admins cannot self-register")

    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        pw_hash = hash_password(data.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = User(
        id=str(uuid.uuid4()),
        email=data.email,
        role=UserRole(data.role),
        is_active=True,
        profile_complete=False,
        password_hash=pw_hash,
    )
    db.add(user)
    await db.flush()

    access_token = create_access_token({"sub": user.id, "role": user.role})
    refresh_token = create_refresh_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    # Admins must use /auth/admin/login
    if data.role == UserRole.admin:
        raise HTTPException(status_code=403, detail="Use the admin login endpoint")

    result = await db.execute(select(User).where(User.email == data.email, User.role == data.role))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")
    if not user.password_hash:
        raise HTTPException(status_code=400, detail="This account uses Google sign-in. Please continue with Google or set a password.")
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token({"sub": user.id, "role": user.role})
    refresh_token = create_refresh_token({"sub": user.id, "role": user.role})
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
    )


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
