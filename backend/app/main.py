from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.core.config import settings
from app.api.v1 import auth, patients, doctors, appointments, sessions, payments, specializations, admin

app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    description="Hospital Management System API",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Middleware
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(
        {
            settings.FRONTEND_URL,
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        }
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
PREFIX = "/api/v1"
app.include_router(auth.router, prefix=PREFIX)
app.include_router(patients.router, prefix=PREFIX)
app.include_router(doctors.router, prefix=PREFIX)
app.include_router(appointments.router, prefix=PREFIX)
app.include_router(sessions.router, prefix=PREFIX)
app.include_router(payments.router, prefix=PREFIX)
app.include_router(specializations.router, prefix=PREFIX)
app.include_router(admin.router, prefix=PREFIX)


@app.get("/api/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
