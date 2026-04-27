# 🏥 Hospital Management System (HMS)

A full-stack Hospital Management System with three user roles — **Patient**, **Doctor**, and **Admin** — built with FastAPI, React + Tailwind, and PostgreSQL.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy (async), Alembic |
| Database | PostgreSQL 16 |
| Frontend | React 18 + Vite, TailwindCSS, React Query |
| Auth | Google OAuth 2.0 + JWT |
| Admin Auth | Separate credential-based login |

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 16 running locally

### 1. Database Setup
```bash
# Create database
psql -U postgres -c "CREATE DATABASE hms_db;"
```

### 2. Backend Setup
```bash
cd backend

# Copy env file
cp .env.example .env
# Edit .env — fill in DB credentials, Google OAuth, etc.

# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Seed specializations (from JSON file)
python seed_specializations.py

# Seed admin account
python seed_admin.py

# Start backend
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies (already done if you followed scaffolding)
npm install

# Start dev server
npm run dev
```

### 4. Access the App
- Patient/Doctor login: http://localhost:5173/login
- Admin login: http://localhost:5173/admin-login *(not linked from public UI)*
- API docs: http://localhost:8000/api/docs

---

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/hms_db
SECRET_KEY=your-super-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:5173
ADMIN_EMAIL=admin@hms.com
ADMIN_PASSWORD=Admin@123456
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:8000/api/v1
```

---

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable **Google OAuth2 API**
3. Create OAuth 2.0 credentials (Web application)
4. Add `http://localhost:8000/api/v1/auth/google/callback` to Authorized Redirect URIs
5. Copy Client ID and Secret into `backend/.env`

---

## Project Structure

```
hsm_cloudrep/
├── backend/
│   ├── app/
│   │   ├── api/v1/         # All API routes
│   │   ├── core/           # Config, DB, security
│   │   ├── models/         # SQLAlchemy ORM models
│   │   └── schemas/        # Pydantic schemas
│   ├── alembic/            # Migrations
│   ├── seed_specializations.py
│   ├── seed_admin.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── api/            # Axios API clients
│       ├── context/        # Auth context
│       └── pages/
│           ├── auth/
│           ├── patient/
│           ├── doctor/
│           └── admin/
├── specialization          # Source spec JSON
├── docker-compose.yml
└── README.md
```

---

## Database Schema Highlights

- **appointments**: includes `doctor_id FK`, unified status enum (`pending`, `confirmed`, `completed`, `doctor_withdrawn`, `patient_withdrawn`, `doctor_absent`, `patient_absent`), `cancellation_reason` (optional)
- **diagnoses**: includes `next_visit_date` for doctor-recommended follow-up
- **notification_preferences**: per-user channel selection (`email`, `mobile`)
- **specializations**: seeded from `specialization` JSON (870+ entries), never hardcoded in frontend

---

## Key Features

### Patient
- Google OAuth signup with profile completion
- Doctor search by name/specialization (from DB)
- Appointment booking with T&C acknowledgement and slot assignment
- Mock payment flow with receipt button placeholder
- Medical history with AI summary placeholder and group-by-doctor toggle
- Notification preference management (email/mobile)

### Doctor
- Today's sessions with "Start Session" → Current Session view
- Split-panel current session: patient queue + profile + diagnosis form
- `next_visit_date` field in diagnosis form
- Schedule management (weekly recurring slots)

### Admin
- Separate non-public login at `/admin-login`
- Doctor verification, user activation/suspension
- Specialization management (add/edit from DB)
- T&C text editor + cancellation policy hour configuration
- Audit logs

---

## Future Enhancements (Architecture Ready)
- [ ] Real payment gateway (Stripe/PayHere)
- [ ] AI diagnosis summaries (Gemini / OpenAI)
- [ ] Email/SMS notifications
- [ ] PDF receipt generation
- [ ] Cloud file storage (S3)
