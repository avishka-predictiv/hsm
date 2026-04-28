# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hospital Management System (HMS) — a full-stack app with three user roles (Patient, Doctor, Admin) built with FastAPI + React + PostgreSQL. The backend is the source of truth; the frontend must stay 100% compatible with it.

---

## Development Commands

### Backend

```bash
cd backend

# Install dependencies (first time or after changes)
pip install -r requirements.txt

# Database migrations
alembic upgrade head          # apply all pending migrations
alembic revision --autogenerate -m "description"  # create a new migration

# Seed data (run once after migrations)
python seed_specializations.py
python seed_admin.py          # creates admin@hms.com / Admin@123456

# Run dev server (port 8000)
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

npm install
npm run dev      # dev server at http://localhost:5173
npm run build    # production build
```

### Docker (full stack)

```bash
docker compose up --build
```

---

## Architecture

### Backend (`backend/`)

- **FastAPI** with async SQLAlchemy (`asyncpg` driver) on PostgreSQL 16
- All routes live under `/api/v1` prefix (see [backend/app/main.py](backend/app/main.py))
- Routers: `auth`, `patients`, `doctors`, `appointments`, `sessions`, `payments`, `specializations`, `admin`
- Health check at `/api/health` (not under `/api/v1`)
- Swagger UI at `http://localhost:8000/api/docs` — use this to verify request/response shapes

**Layer structure:**
- [backend/app/api/v1/](backend/app/api/v1/) — route handlers (FastAPI routers, one file per domain)
- [backend/app/models/](backend/app/models/) — SQLAlchemy ORM models (all inherit from `Base` in `database.py`)
- [backend/app/schemas/](backend/app/schemas/) — Pydantic v2 request/response schemas
- [backend/app/core/](backend/app/core/) — `config.py` (pydantic-settings), `database.py` (async engine + session), `security.py` (JWT + bcrypt + `require_role` dependency)
- [backend/alembic/](backend/alembic/) — migrations; `env.py` imports all models via `import app.models` to register metadata

**Auth pattern:**
- Patients/doctors: Google OAuth 2.0 → backend redirects to frontend `/auth/callback?access_token=...&refresh_token=...&profile_complete=...&role=...`
- Admin: email+password POST to `/auth/admin/login`
- All protected routes use `Depends(get_current_user)` or `Depends(require_role("patient"))` from `security.py`
- JWTs carry `sub` (user id) and `type` (`access` or `refresh`)

**DB session:** `get_db()` yields an `AsyncSession` that auto-commits on success and rolls back on exception.

### Frontend (`frontend/`)

- **React 18 + Vite** (currently JSX, not TypeScript despite `tsconfig.json`)
- **TailwindCSS 3** with a CSS variable-based theme (dark mode via `class` strategy — see `ThemeContext`)
- **TanStack Query v5** for all server state (configured in `App.jsx` with `staleTime: 30000`, `retry: 1`)
- **Axios** with request/response interceptors in [frontend/src/api/index.js](frontend/src/api/index.js) — auto-attaches `Bearer` token, auto-refreshes on 401

**Key files:**
- [frontend/src/App.jsx](frontend/src/App.jsx) — router definition, `ProtectedRoute` (role + profile_complete guard), `RoleRedirect`
- [frontend/src/api/index.js](frontend/src/api/index.js) — single Axios instance + all API helper namespaces (`authApi`, `doctorApi`, `patientApi`, `appointmentApi`, `sessionApi`, `paymentApi`, `specializationApi`, `adminApi`)
- [frontend/src/context/AuthContext.jsx](frontend/src/context/AuthContext.jsx) — current user state, boots by calling `GET /auth/me`
- [frontend/src/context/ThemeContext.jsx](frontend/src/context/ThemeContext.jsx) — dark/light preference in `localStorage`

**Route layout:**
- `/login` → Landing/Google OAuth buttons
- `/auth/callback` → OAuthCallback (reads URL params, persists tokens)
- `/complete-profile` → CompleteProfile (patient or doctor based on role)
- `/admin-login` → AdminLogin (hidden, not linked from public UI)
- `/patient/*` → PatientLayout (nested routes: home, doctors, book, appointments, history, payments, profile, notifications)
- `/doctor/*` → DoctorLayout (home, today, session/:id, schedule, profile, appointments)
- `/admin/*` → AdminLayout (dashboard, users, doctor-verification, appointments, payments, specializations, settings, audit-logs)

**Vite proxy:** `/api` is proxied to `http://localhost:8000` in dev. The `VITE_API_URL` env var defaults to `http://localhost:8000/api/v1`.

---

## Critical Implementation Details

### API quirks
- `addSpecialization` and `updateSpecialization` send `name`/`code` as **query params**, not JSON body: `api.post("/admin/specializations", null, { params: { name, code } })`
- Appointment cancellation uses `DELETE` with a body: `api.delete("/appointments/:id", { data: { reason } })`
- File uploads to `/appointments/:id/attachments` use `multipart/form-data`

### Auth flow
1. Patient/doctor login: frontend does `window.location.href = "${VITE_API_URL}/auth/google?role=patient"` → Google OAuth → backend redirects back to `/auth/callback`
2. Tokens and user stored in `localStorage` (`access_token`, `refresh_token`, `user`)
3. On 401: interceptor tries refresh once, then clears storage and redirects to `/login`
4. Profile incomplete users (`profile_complete=false`) are redirected to `/complete-profile`

### Appointment status enum
`pending | confirmed | completed | doctor_withdrawn | patient_withdrawn | doctor_absent | patient_absent`

### Backend environment (`backend/.env`)
```
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/hms_db
SECRET_KEY=your-super-secret-key
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:5173
ADMIN_EMAIL=admin@hms.com
ADMIN_PASSWORD=Admin@123456
```

### Frontend environment (`frontend/.env`)
```
VITE_API_URL=http://localhost:8000/api/v1
```
