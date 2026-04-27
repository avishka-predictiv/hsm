# HMS Frontend — Build Specification (for Claude Code)

> **Goal:** Rebuild the `frontend/` of this Hospital Management System from scratch into a beautiful, modern, production-quality React app that is **100% compatible with the existing FastAPI backend**.
>
> **How to use this file:** Open this repository in Claude Code. Tell Claude:
> *"Read `FRONTEND_SPEC.md` and rebuild the entire `frontend/` folder according to it. Delete the old contents of `frontend/src/` first. Do not touch the `backend/` folder."*
>
> Everything Claude needs (API contract, routes, role flows, design system, file layout, env vars) is in this single file.

---

## 1. Project Context

| Layer | Technology | Notes |
|---|---|---|
| Backend | FastAPI + SQLAlchemy (async) + PostgreSQL | Already built. **Do not modify.** |
| Backend base URL | `http://localhost:8000/api/v1` | Configurable via `VITE_API_URL` |
| Auth | Google OAuth 2.0 (patients/doctors) + email-password (admin) | JWT access + refresh tokens |
| Frontend stack (target) | React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui + React Router v6 + TanStack Query v5 + Axios + Zod + react-hook-form + lucide-react + react-hot-toast + date-fns | Modern, typed, polished |
| Frontend dev server | `http://localhost:5173` | Already configured in backend CORS |

The backend exposes Swagger docs at `http://localhost:8000/api/docs` — use it to verify request/response shapes while building.

---

## 2. Three User Roles

The app has **three distinct experiences**:

1. **Patient** — books appointments with doctors, views medical history, manages profile & payments.
2. **Doctor** — manages weekly schedule, runs live consultation sessions, records diagnoses.
3. **Admin** — verifies doctors, manages users / specializations / system settings, views audit logs. Logs in through a **separate, non-publicly-linked URL**.

Patients and doctors authenticate with **Google OAuth**. Admins authenticate with **email + password** at a hidden route.

---

## 3. Design System — "Clinical Calm"

Build a UI that feels like a premium healthcare product (think Linear × Notion × One Medical). Don't ship the typical generic Tailwind dashboard.

### 3.1 Visual language

- **Aesthetic:** clean, airy, soft-shadowed cards, generous whitespace, rounded-2xl corners, subtle motion.
- **Density:** comfortable (not cramped). Default text size `15px`, line-height 1.5.
- **Iconography:** `lucide-react` only. Stroke-width 1.75. Icon sizes: 16/20/24.
- **Imagery:** no stock-photo doctors. Use abstract gradients, glyphs, and initials avatars.

### 3.2 Color tokens (Tailwind config)

```js
// tailwind.config.js — extend.colors
colors: {
  brand: {
    50:  '#f0f7ff',
    100: '#e0eefe',
    200: '#bbdcfd',
    300: '#7ebffb',
    400: '#3a9cf5',
    500: '#1a7fe6',  // primary
    600: '#0c63c4',
    700: '#0c4f9e',
    800: '#104382',
    900: '#13396b',
  },
  accent: {
    mint: '#10b981',     // success / confirmed
    amber: '#f59e0b',    // pending / warning
    rose:  '#f43f5e',    // danger / cancelled
    violet:'#8b5cf6',    // doctor accent
    slate: '#64748b',    // muted
  },
  surface: {
    bg:     '#f7f9fc',   // page bg (light)
    card:   '#ffffff',
    border: '#e5e9f0',
    muted:  '#f1f4f9',
  },
  ink: {
    DEFAULT: '#0f172a',
    soft:    '#475569',
    mute:    '#94a3b8',
  },
}
```

Provide a **dark mode** (`class` strategy) with equivalent surface/ink tokens. The existing `ThemeToggle.jsx` pattern can be kept — store preference in `localStorage`.

### 3.3 Typography

- **Sans:** `Inter` (variable). Loaded via `@fontsource-variable/inter`.
- **Display:** `Inter` with `font-feature-settings: 'cv11', 'ss01'` for slightly more character on headings.
- **Mono:** `JetBrains Mono` for IDs, transaction refs, code-like fields.

Heading scale: `text-3xl font-semibold tracking-tight` (page titles) → `text-xl font-semibold` (section) → `text-sm font-medium uppercase tracking-wider text-ink-mute` (eyebrow).

### 3.4 Components (shadcn/ui)

Install shadcn/ui (`npx shadcn@latest init`) and generate the following primitives:
`button, card, input, textarea, label, select, dropdown-menu, dialog, sheet, tabs, table, badge, avatar, calendar, popover, command, toast, separator, skeleton, alert, tooltip, scroll-area, switch, checkbox, radio-group, form`.

Then build these **composite components** in `src/components/`:
- `AppShell` — sidebar + topbar layout shell with role-aware nav.
- `RoleSidebar` — collapsible sidebar; nav items vary by role.
- `Topbar` — search (where applicable), notifications bell, user menu, theme toggle.
- `StatCard` — KPI tile with icon, label, big value, delta hint.
- `EmptyState` — illustration glyph + title + description + CTA.
- `PageHeader` — title, breadcrumbs, primary actions.
- `DataTable` — TanStack-Table-powered table with column visibility, sorting, pagination, row selection.
- `StatusBadge` — maps `AppointmentStatus` / `SessionStatus` / `PaymentStatus` to colored badges.
- `DoctorCard` — avatar (initials), name, specializations, fee, rating placeholder, "Book" button.
- `SlotPicker` — visual grid of slot numbers with available/booked states.
- `ConfirmDialog` — reusable confirm with optional reason textarea (used for cancellations).
- `LoadingSpinner` and full `PageSkeleton` (shimmer skeletons, never blank screens).
- `ErrorBoundary` with a friendly fallback.

### 3.5 Motion

Use `framer-motion` for: page transitions (fade+slide 8px, 180ms), dialog/sheet enter, sidebar collapse, toast enter, list item stagger (40ms). Respect `prefers-reduced-motion`.

### 3.6 Accessibility

- All interactive elements keyboard-reachable; visible focus rings (`ring-2 ring-brand-500 ring-offset-2`).
- Dialogs trap focus, return focus on close.
- Form fields have associated `<label>` and aria-describedby for errors.
- Color contrast ≥ WCAG AA.

---

## 4. File / Folder Layout

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── .env                       # VITE_API_URL=http://localhost:8000/api/v1
├── .env.example
├── public/
│   └── favicon.svg
└── src/
    ├── main.tsx               # React root + Providers
    ├── App.tsx                # Router definition
    ├── index.css              # Tailwind layers + CSS vars
    ├── lib/
    │   ├── api.ts             # Axios instance + interceptors (see §6)
    │   ├── queryClient.ts     # QueryClient config (staleTime, retry)
    │   ├── auth.ts            # token storage helpers
    │   ├── utils.ts           # cn(), formatDate, formatCurrency, etc.
    │   └── constants.ts       # status maps, role labels, gender options
    ├── types/
    │   ├── auth.ts
    │   ├── patient.ts
    │   ├── doctor.ts
    │   ├── appointment.ts
    │   ├── diagnosis.ts
    │   ├── payment.ts
    │   └── admin.ts
    ├── api/                   # Thin per-domain API modules (see §6.3)
    │   ├── auth.api.ts
    │   ├── patients.api.ts
    │   ├── doctors.api.ts
    │   ├── appointments.api.ts
    │   ├── sessions.api.ts
    │   ├── payments.api.ts
    │   ├── specializations.api.ts
    │   └── admin.api.ts
    ├── hooks/                 # TanStack Query hooks wrapping api/*
    │   ├── useAuth.ts
    │   ├── useDoctors.ts
    │   ├── useAppointments.ts
    │   ├── useSessions.ts
    │   ├── usePayments.ts
    │   ├── useSpecializations.ts
    │   └── useAdmin.ts
    ├── context/
    │   ├── AuthContext.tsx    # current user, login, logout, refresh
    │   └── ThemeContext.tsx
    ├── components/            # See §3.4
    │   ├── shell/
    │   ├── ui/                # shadcn primitives
    │   └── shared/
    ├── routes/
    │   ├── ProtectedRoute.tsx # role-gated wrapper
    │   └── PublicRoute.tsx
    └── pages/
        ├── Landing.tsx
        ├── auth/
        │   ├── Login.tsx
        │   ├── AdminLogin.tsx          # /admin-login (hidden)
        │   ├── OAuthCallback.tsx       # /auth/callback
        │   ├── CompletePatientProfile.tsx
        │   └── CompleteDoctorProfile.tsx
        ├── patient/
        │   ├── PatientDashboard.tsx
        │   ├── FindDoctors.tsx
        │   ├── DoctorDetail.tsx        # availability + booking
        │   ├── BookAppointment.tsx     # T&C, symptoms, slot
        │   ├── MyAppointments.tsx      # upcoming + past tabs
        │   ├── MedicalHistory.tsx
        │   ├── Payments.tsx
        │   ├── PaymentMethods.tsx
        │   ├── PatientProfile.tsx
        │   └── NotificationSettings.tsx
        ├── doctor/
        │   ├── DoctorDashboard.tsx
        │   ├── TodaySessions.tsx
        │   ├── CurrentSession.tsx      # split-panel: queue + profile + diagnosis
        │   ├── MySchedule.tsx
        │   ├── DoctorProfile.tsx
        │   └── DoctorAppointments.tsx
        └── admin/
            ├── AdminDashboard.tsx
            ├── Users.tsx
            ├── DoctorVerification.tsx
            ├── AllAppointments.tsx
            ├── AllPayments.tsx
            ├── Specializations.tsx
            ├── SystemSettings.tsx       # T&C text + cancellation hours
            └── AuditLogs.tsx
```

---

## 5. Environment & Setup

### `frontend/.env.example`

```
VITE_API_URL=http://localhost:8000/api/v1
```

### `package.json` dependencies

```json
{
  "dependencies": {
    "@fontsource-variable/inter": "^5.x",
    "@hookform/resolvers": "^3.x",
    "@radix-ui/react-*": "via shadcn",
    "@tanstack/react-query": "^5.x",
    "@tanstack/react-table": "^8.x",
    "axios": "^1.x",
    "class-variance-authority": "^0.7.x",
    "clsx": "^2.x",
    "date-fns": "^3.x",
    "framer-motion": "^11.x",
    "lucide-react": "^0.460.x",
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-hook-form": "^7.x",
    "react-hot-toast": "^2.x",
    "react-router-dom": "^6.x",
    "tailwind-merge": "^2.x",
    "zod": "^3.x"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "@vitejs/plugin-react": "^4.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x",
    "tailwindcss": "^3.4.x",
    "tailwindcss-animate": "^1.x",
    "typescript": "^5.x",
    "vite": "^5.x"
  }
}
```

> Use whatever current minor version `npm install <pkg>@latest` resolves to. Do not invent versions.

### `vite.config.ts`

- React plugin
- Path alias: `@` → `./src`
- Dev server port: `5173`

---

## 6. API Layer (CRITICAL — must match backend exactly)

### 6.1 Backend base URL

`{VITE_API_URL}` (default `http://localhost:8000/api/v1`).

All authenticated endpoints expect header: `Authorization: Bearer <access_token>`.

### 6.2 Axios instance (`src/lib/api.ts`)

```ts
import axios from "axios";

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("access_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// 401 → try refresh once → retry; on failure, hard-logout
api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL}/auth/refresh`,
            { refresh_token: refresh }
          );
          localStorage.setItem("access_token", data.access_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  }
);
```

### 6.3 Full endpoint catalog

All paths are **relative to `/api/v1`**. Group by tag matching the backend.

#### Authentication (`/auth`)

| Method | Path | Auth | Body | Returns | Used By |
|---|---|---|---|---|---|
| GET | `/auth/google?role=patient\|doctor` | none | – | 302 redirect to Google | `Login` page (`window.location.href = ...`) |
| GET | `/auth/google/callback` | none | – | 302 redirect to `${FRONTEND_URL}/auth/callback?access_token=...&refresh_token=...&profile_complete=...&role=...` | Backend → `OAuthCallback` page |
| POST | `/auth/admin/login` | none | `{ email, password }` | `TokenResponse` | `AdminLogin` |
| POST | `/auth/refresh` | none | `{ refresh_token }` | `{ access_token, token_type }` | Axios interceptor |
| GET | `/auth/me` | Bearer | – | `UserOut` | `AuthContext` boot |
| POST | `/auth/complete-profile/patient` | Bearer (patient) | `PatientProfileCreate` | `{ message }` | `CompletePatientProfile` |
| POST | `/auth/complete-profile/doctor` | Bearer (doctor) | `DoctorProfileCreate` | `{ message }` | `CompleteDoctorProfile` |

#### Patients (`/patients`)

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| GET | `/patients/profile/me` | Bearer (patient) | – | `PatientOut` |
| PUT | `/patients/profile/me` | Bearer (patient) | `PatientProfileUpdate` | `PatientOut` |
| GET | `/patients/notification-preferences` | Bearer (any user) | – | `{ email: bool, mobile: bool }` |
| PUT | `/patients/notification-preferences` | Bearer (any user) | `{ email: bool, mobile: bool }` | `{ message }` |

#### Doctors (`/doctors`)

| Method | Path | Auth | Query | Returns |
|---|---|---|---|---|
| GET | `/doctors` | none | `name?, specialization_id?, page=1, size=20` | `DoctorOut[]` (only `is_verified=true`) |
| GET | `/doctors/{doctor_id}` | none | – | `DoctorOut` |
| GET | `/doctors/{doctor_id}/availability` | none | – | `{ session_id, date, start_time, end_time, slot_duration_mins, max_patients }[]` |
| GET | `/doctors/profile/me` | Bearer (doctor) | – | `DoctorOut` |
| PUT | `/doctors/profile/me` | Bearer (doctor) | `DoctorProfileUpdate` | `DoctorOut` |
| GET | `/doctors/schedules/me` | Bearer (doctor) | – | `DoctorScheduleOut[]` |
| POST | `/doctors/schedules/me` | Bearer (doctor) | `DoctorScheduleCreate` | `DoctorScheduleOut` |

#### Appointments (`/appointments`)

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/appointments` | Bearer (patient) | `{ session_id, symptoms_text?, terms_accepted: true }` | `AppointmentOut` |
| GET | `/appointments/upcoming` | Bearer (patient) | – | `AppointmentOut[]` (status=confirmed, future) |
| GET | `/appointments/history` | Bearer (patient) | – | `AppointmentOut[]` (status=completed) |
| DELETE | `/appointments/{id}` | Bearer (any role, must own) | `{ reason? }` | `{ message, refund_policy: "full_refund"\|"partial_refund"\|"no_refund", status }` |
| POST | `/appointments/{id}/attachments` | Bearer (patient) | `multipart/form-data` (`file`) | `{ message, file_path }` |
| GET | `/appointments/slots/{session_id}` | none | – | `SlotInfo[]` |

#### Sessions (`/sessions`) — doctor-side

| Method | Path | Auth | Body / Query | Returns |
|---|---|---|---|---|
| GET | `/sessions/my?upcoming=true\|false` | Bearer (doctor) | – | `SessionOut[]` |
| GET | `/sessions/today` | Bearer (doctor) | – | `SessionOut[]` |
| POST | `/sessions` | Bearer (doctor) | `SessionCreate` | `SessionOut` |
| POST | `/sessions/{id}/start` | Bearer (doctor) | – | `{ message, session_id }` |
| POST | `/sessions/{id}/end` | Bearer (doctor) | – | `{ message, session_id }` |
| GET | `/sessions/{id}/patients` | Bearer (doctor) | – | `Array<{ appointment_id, slot_number, status, patient: {...}, has_diagnosis, symptoms_text }>` |
| POST | `/sessions/{sid}/appointments/{aid}/diagnosis` | Bearer (doctor) | `DiagnosisCreate` | `DiagnosisOut` |

#### Payments (`/payments`)

| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/payments` | Bearer (patient) | `PaymentCreate` | `PaymentOut` (mock — instant `success`) |
| GET | `/payments/history` | Bearer (patient) | – | `PaymentOut[]` |
| GET | `/payments/{id}/receipt` | Bearer (patient) | – | `{ message, payment_id, amount, transaction_ref, status }` (placeholder) |
| GET | `/payments/methods` | Bearer (patient) | – | `PaymentMethodOut[]` |
| POST | `/payments/methods` | Bearer (patient) | `PaymentMethodCreate` | `PaymentMethodOut` |
| DELETE | `/payments/methods/{id}` | Bearer (patient) | – | `{ message }` |

#### Specializations (`/specializations`)

| Method | Path | Auth | Returns |
|---|---|---|---|
| GET | `/specializations` | none | `SpecializationOut[]` |

#### Admin (`/admin`)

| Method | Path | Auth | Body / Query | Returns |
|---|---|---|---|---|
| GET | `/admin/stats` | Bearer (admin) | – | `{ total_patients, total_doctors, total_appointments, total_revenue }` |
| GET | `/admin/users?role=&page=&size=` | Bearer (admin) | – | `UserOut[]` |
| PUT | `/admin/users/{user_id}/toggle-active` | Bearer (admin) | – | `{ user_id, is_active }` |
| PUT | `/admin/doctors/{doctor_id}/verify` | Bearer (admin) | – | `{ message, doctor_id }` |
| GET | `/admin/appointments?page=&size=` | Bearer (admin) | – | `AppointmentOut[]` |
| GET | `/admin/payments?page=&size=` | Bearer (admin) | – | `PaymentOut[]` |
| GET | `/admin/audit-logs?page=&size=` | Bearer (admin) | – | `AuditLog[]` |
| POST | `/admin/specializations?name=&code=` | Bearer (admin) | – (query string!) | `SpecializationOut` |
| PUT | `/admin/specializations/{id}?name=` | Bearer (admin) | – (query string!) | `SpecializationOut` |
| GET | `/admin/settings` | Bearer (admin) | – | `Record<string, any>` |
| PUT | `/admin/settings/{key}` | Bearer (admin) | JSON value (object) | `{ key, value }` |

**⚠️ Note:** `add/updateSpecialization` send `name` and `code` as **query parameters**, NOT JSON body. Use `axios.post(url, null, { params: { name, code } })`.

#### Health

| Method | Path | Returns |
|---|---|---|
| GET | `/api/health` (NOT under `/api/v1`) | `{ status, app }` |

### 6.4 TypeScript types (mirror backend Pydantic schemas)

Place in `src/types/`. Examples — implement them all faithfully:

```ts
// types/auth.ts
export type UserRole = "patient" | "doctor" | "admin";

export interface UserOut {
  id: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  profile_complete: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: "bearer";
  user: UserOut;
}
```

```ts
// types/appointment.ts
export type AppointmentStatus =
  | "pending" | "confirmed" | "completed"
  | "doctor_withdrawn" | "patient_withdrawn"
  | "doctor_absent" | "patient_absent";

export type SessionStatus = "scheduled" | "active" | "completed" | "cancelled";

export interface AppointmentOut {
  id: string;
  patient_id: string;
  session_id: string;
  doctor_id: string;
  slot_number: number;
  status: AppointmentStatus;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  booked_at: string;
  symptoms_text: string | null;
  terms_accepted: boolean;
}

export interface SessionOut {
  id: string;
  doctor_id: string;
  date: string;       // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string;
  slot_duration_mins: number;
  max_patients: number;
  status: SessionStatus;
  booked_count?: number;
}

export interface SlotInfo {
  slot_number: number;
  start_time: string; // HH:MM
  is_available: boolean;
}
```

(Mirror similarly for `PatientOut`, `DoctorOut`, `SpecializationOut`, `DoctorScheduleOut`, `DiagnosisOut`, `PaymentOut`, `PaymentMethodOut` — exact field names from §6.)

---

## 7. Authentication & Routing

### 7.1 Token storage

`localStorage.access_token`, `localStorage.refresh_token`, `localStorage.user` (JSON). On every app boot, `AuthContext` calls `GET /auth/me` if a token exists; on 401 the interceptor handles refresh.

### 7.2 OAuth flow (patient/doctor)

1. User clicks "Sign in with Google as Patient" or "as Doctor" on `/login`.
2. Frontend redirects browser: `window.location.href = "${VITE_API_URL}/auth/google?role=patient"` (or `doctor`).
3. Backend handles OAuth, then redirects browser to: `http://localhost:5173/auth/callback?access_token=...&refresh_token=...&profile_complete=true|false&role=...`.
4. `OAuthCallback.tsx` reads URL search params, persists tokens, then:
   - if `profile_complete === "false"` → navigate to `/onboarding/patient` (or `/onboarding/doctor`)
   - else navigate to `/app` (role-based dashboard)

### 7.3 Admin login

- Page at `/admin-login` (no link from public UI; user must type the URL).
- Form posts to `/auth/admin/login` and on success persists tokens, sets user, navigates to `/admin`.

### 7.4 Route map

```
/                              → Landing (marketing-lite, hero, features, CTA to /login)
/login                         → Login (Google buttons for patient & doctor)
/admin-login                   → AdminLogin (hidden, email/password)
/auth/callback                 → OAuthCallback
/onboarding/patient            → CompletePatientProfile (if profile_complete=false)
/onboarding/doctor             → CompleteDoctorProfile

/app                           → role-based redirect
  /app/patient                 → PatientDashboard      [role=patient]
  /app/patient/doctors         → FindDoctors
  /app/patient/doctors/:id     → DoctorDetail
  /app/patient/book/:sessionId → BookAppointment
  /app/patient/appointments    → MyAppointments
  /app/patient/history         → MedicalHistory
  /app/patient/payments        → Payments
  /app/patient/payment-methods → PaymentMethods
  /app/patient/profile         → PatientProfile
  /app/patient/settings        → NotificationSettings

  /app/doctor                  → DoctorDashboard       [role=doctor]
  /app/doctor/today            → TodaySessions
  /app/doctor/session/:id      → CurrentSession
  /app/doctor/schedule         → MySchedule
  /app/doctor/appointments     → DoctorAppointments
  /app/doctor/profile          → DoctorProfile

/admin                         → AdminDashboard         [role=admin]
/admin/users                   → Users
/admin/doctor-verification     → DoctorVerification
/admin/appointments            → AllAppointments
/admin/payments                → AllPayments
/admin/specializations         → Specializations
/admin/settings                → SystemSettings
/admin/audit-logs              → AuditLogs

*                              → 404 NotFound
```

### 7.5 `ProtectedRoute`

Wrap role-restricted routes:

```tsx
<Route element={<ProtectedRoute roles={["patient"]} />}>
  <Route path="/app/patient" element={<PatientDashboard />} />
  ...
</Route>
```

Behavior: if no user → redirect to `/login`. If user role mismatches → redirect to their dashboard. If `profile_complete=false` and current path isn't onboarding → redirect to onboarding.

---

## 8. Page-by-Page Specifications

### 8.1 Landing (`/`)

- Soft gradient hero ("Healthcare, simply organized.")
- 3-up feature grid (Find doctors / Book in seconds / Carry your history)
- "Sign in" CTA → `/login`
- No mention of admin login.

### 8.2 Login (`/login`)

- Centered card, app logo top.
- Two buttons: **"Continue as Patient with Google"**, **"Continue as Doctor with Google"** (primary, with Google logomark).
- Small footer link: "Forgot which role you signed up with? Contact support."

### 8.3 OAuthCallback (`/auth/callback`)

- Spinner + "Signing you in...". Reads search params, persists, navigates.
- If params missing → redirect to `/login?error=oauth_failed` and toast.

### 8.4 CompletePatientProfile

Form fields (mandatory marked `*`):
`nic*`, `mobile*`, `address*` (textarea), `dob`, `gender` (select: Male/Female/Other/Prefer not to say), `blood_group` (A+, A-, B+, B-, O+, O-, AB+, AB-), `emergency_contact_name`, `emergency_contact_phone`, `known_allergies` (textarea), `chronic_conditions` (textarea), `insurance_info` (textarea).

Validate with Zod. Submit → `POST /auth/complete-profile/patient` → on success update `user.profile_complete=true` and navigate to `/app/patient`.

### 8.5 CompleteDoctorProfile

Fields: `nic*`, `mobile*`, `reg_number*`, `specialization_ids*` (multi-select powered by `GET /specializations` — 870+ entries; use Combobox/Command with virtualized list), `years_experience`, `qualifications` (textarea), `consultation_fee` (number), `affiliation`, `bio` (textarea, ~500 chars).

Submit → `POST /auth/complete-profile/doctor` → navigate to `/app/doctor`. Show banner: "Your account is pending admin verification. You can complete your schedule meanwhile."

### 8.6 Patient Dashboard

KPI grid:
- Upcoming appointments count
- Past consultations count (history length)
- Outstanding payments (none / count)
- Profile completeness %

Sections:
- "Next appointment" card (date, time, doctor, slot, "View" / "Cancel" actions)
- "Recent doctors" (last 3 doctors consulted)
- "Quick actions": Find doctors / Update profile / Notification settings

### 8.7 FindDoctors (`/app/patient/doctors`)

- Filter bar: name search input, specialization combobox (from `/specializations`), pagination.
- Calls `GET /doctors?name=&specialization_id=&page=&size=`.
- Grid of `DoctorCard`s. Each card → clicking goes to `/app/patient/doctors/:id`.
- Empty state when no results.

### 8.8 DoctorDetail (`/app/patient/doctors/:id`)

- Header: avatar, name (use email local-part if no name), specializations as `Badge`s, fee, years_experience, affiliation, bio.
- Tabs: **About** | **Availability**.
- Availability tab: calls `GET /doctors/:id/availability`. Render sessions grouped by date; click a session → `/app/patient/book/:sessionId`.

### 8.9 BookAppointment (`/app/patient/book/:sessionId`)

- Two-column layout.
- Left: doctor mini-card + session date/time + `SlotPicker` (from `GET /appointments/slots/:sessionId`). The first available slot is highlighted as "auto-assigned" but user just confirms — backend assigns the next slot regardless.
- Right: form with `symptoms_text` textarea + T&C checkbox (link opens dialog showing the T&C text from `GET /admin/settings` key `terms_and_conditions` if present).
- Submit → `POST /appointments` with `{ session_id, symptoms_text, terms_accepted: true }`.
- On success → mock payment dialog: "Pay LKR <fee>". Click "Pay" → `POST /payments` → success toast + navigate to `/app/patient/appointments`.

### 8.10 MyAppointments

Tabs: **Upcoming** (`GET /appointments/upcoming`), **Past** (`GET /appointments/history`).
Each row: date+time, doctor name, slot #, status badge, actions (Cancel for upcoming with `ConfirmDialog` capturing reason → `DELETE /appointments/:id`; show returned `refund_policy`).

### 8.11 MedicalHistory

- Calls `GET /appointments/history`.
- Each item shows the diagnosis (the doctor saved it via session diagnosis). For now, the appointment endpoint doesn't expand diagnosis — display what's available; show "AI Summary coming soon" badge per item.
- Toggle: **Group by doctor** vs **Chronological**.

### 8.12 Payments

`GET /payments/history` → table: date, amount, method, status badge, transaction_ref, "Receipt" button → `GET /payments/:id/receipt` → toast: "Receipt generation will be available soon".

### 8.13 PaymentMethods

`GET /payments/methods` list with default star. "Add" opens dialog with type select (`card`, `mobile`, `bank`), label, default checkbox → `POST /payments/methods`. Delete with confirm.

### 8.14 PatientProfile

Editable form pre-filled from `GET /patients/profile/me`. Submit → `PUT /patients/profile/me`. Show NIC as read-only.

### 8.15 NotificationSettings

Two switches: Email, Mobile. `GET/PUT /patients/notification-preferences`.

### 8.16 Doctor Dashboard

- KPIs: Today's sessions, total patients today, completed today, pending verification banner if `is_verified=false`.
- "Today's sessions" list (`GET /sessions/today`) with "Start session" button → opens `/app/doctor/session/:id`.

### 8.17 TodaySessions

Same as dashboard's list but full-page; ability to start/end any of today's sessions.

### 8.18 CurrentSession (`/app/doctor/session/:id`) — the centerpiece

Three-pane split layout:

**Left pane — Patient queue:**
`GET /sessions/:id/patients`. Vertical list ordered by `slot_number`. Each row: slot #, patient initials, NIC last-4, status pill ("Waiting"/"In progress"/"Done"). Click selects a patient.

**Middle pane — Patient profile:**
Read-only summary of the selected patient: NIC, mobile, blood group, allergies, chronic conditions, symptoms_text from booking, attachments list (placeholder "View" actions).

**Right pane — Diagnosis form:**
Fields: `symptoms_observed` (textarea), `diagnosis` (textarea), `prescription` (textarea), `follow_up_notes` (textarea), `next_visit_date` (date picker). Save → `POST /sessions/:sid/appointments/:aid/diagnosis`. On save → mark patient row "Done", auto-advance to next slot. After all done, "End session" button → `POST /sessions/:id/end` → navigate to `TodaySessions`.

Top of the page has "Start session" if status=scheduled (call `POST /sessions/:id/start` first).

### 8.19 MySchedule (`/app/doctor/schedule`)

- Weekly grid (Mon–Sun). Each day shows existing schedule blocks (`GET /doctors/schedules/me`).
- "Add block" dialog: `day_of_week` (select), `start_time`, `end_time` (HH:MM:SS — show 5-min steps), `slot_duration_mins` (default 15), `max_patients` (default 20). Submit → `POST /doctors/schedules/me`.
- Show note: "Sessions are generated from these blocks by the system."

### 8.20 DoctorProfile

Editable form (`GET/PUT /doctors/profile/me`); specialization multi-select. Show verification badge.

### 8.21 DoctorAppointments

Read-only list of all the doctor's upcoming sessions and their bookings (derive by listing `/sessions/my?upcoming=true` then loading each session's patients on expand).

### 8.22 Admin Dashboard

KPIs from `GET /admin/stats`. Below: latest 5 audit logs (`GET /admin/audit-logs?size=5`), pending doctor verifications.

### 8.23 Users

`DataTable` powered by `GET /admin/users?role=&page=`. Filter by role (chip group: All / Patient / Doctor / Admin). Action menu: Toggle active (`PUT /admin/users/:id/toggle-active`) with confirm.

### 8.24 DoctorVerification

Table of unverified doctors. "Verify" button → `PUT /admin/doctors/:id/verify` with optimistic update + toast.

### 8.25 AllAppointments / AllPayments

Paginated tables.

### 8.26 Specializations

Searchable list; "Add" dialog (name + code) → `POST /admin/specializations` (query params!). Inline rename → `PUT /admin/specializations/:id` (query params!).

### 8.27 SystemSettings

Form for two known settings:
- `terms_and_conditions` — large textarea (markdown supported visually)
- `cancellation_policy_hours` — number input (default 24)

Loads via `GET /admin/settings`. Saves each via `PUT /admin/settings/:key` with body = the value (object form, e.g. `{ "value": "..." }` — wrap because backend `value: dict` is JSON column).

### 8.28 AuditLogs

`DataTable` of `GET /admin/audit-logs`. Columns: timestamp, actor, action, target.

---

## 9. UX Details that elevate the build

- **Optimistic mutations** for toggles (active, verify) using TanStack `useMutation` + `setQueryData`.
- **Keyboard shortcuts** in `CurrentSession`: `↑/↓` to change patient, `Cmd/Ctrl+S` to save diagnosis.
- **Command palette** (`Cmd/Ctrl+K`) using `cmdk` — quick navigation; only available inside `/app/*` and `/admin/*`.
- **Toasts** for every mutation (success + error). Use `react-hot-toast` with custom styled `toast.success`/`toast.error`.
- **Skeletons** on all queries (no spinners on full pages).
- **Empty states** with a soft icon + helpful CTA (e.g. "No appointments yet — find a doctor").
- **Date formatting** via `date-fns`: `format(parseISO(s.date), "EEE, d LLL yyyy")` and times rendered as `HH:mm` (strip seconds).
- **Currency**: `new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR" })`.
- **Avatars**: deterministic gradient from email hash + initials.
- **Status badges** mapping (use these colors):
  - `confirmed` / `success` / `scheduled` → mint
  - `pending` → amber
  - `completed` → brand-500
  - `cancelled` / `*_withdrawn` / `*_absent` / `failed` → rose
  - `refunded` / `partial_refund` → violet
- **Responsive**: mobile-first. Sidebar collapses to a bottom nav on `< md`.

---

## 10. Quality bar / "Definition of Done"

- ✅ TypeScript strict mode; no `any` except in narrowly-justified spots.
- ✅ All API calls go through `src/api/*.api.ts` with typed return values; pages never `axios` directly.
- ✅ TanStack Query for all server state. No `useEffect` data fetching.
- ✅ No console errors / warnings on any page.
- ✅ Lighthouse: Performance ≥ 90, Accessibility ≥ 95.
- ✅ Builds with `npm run build` with no TS errors.
- ✅ Works against the running backend (`uvicorn app.main:app --reload --port 8000`) end-to-end:
  - Patient can sign up via Google, complete profile, search a doctor, view availability, book an appointment, complete mock payment, see it in upcoming, cancel it.
  - Doctor can sign up, complete profile, add a schedule, create a session, view its patients, save a diagnosis, end the session.
  - Admin can log in via `/admin-login`, verify a doctor, toggle a user, add a specialization, edit T&C.

---

## 11. Build instructions for Claude Code

Execute in this order:

1. **Wipe** existing `frontend/src/` and `frontend/index.html`. Keep `frontend/public/` (favicon).
2. Update `frontend/package.json` with the dependencies in §5. Run `npm install`.
3. Initialize TS, Tailwind, shadcn/ui per §3 / §4. Configure path alias `@`.
4. Implement `src/lib/api.ts`, `src/lib/queryClient.ts`, `src/lib/auth.ts`, `src/lib/utils.ts`.
5. Implement `src/types/*` (mirror §6.4 fully).
6. Implement `src/api/*.api.ts` modules covering every endpoint in §6.3.
7. Implement `AuthContext`, `ThemeContext`, `ProtectedRoute`.
8. Implement shell components (`AppShell`, `RoleSidebar`, `Topbar`) and shared components (§3.4).
9. Implement pages role-by-role in this order: **auth → patient → doctor → admin**. Wire each page through TanStack Query hooks in `src/hooks/`.
10. Polish: motion, empty states, skeletons, command palette, keyboard shortcuts.
11. Run `npm run dev`, verify against backend, fix issues until §10 checklist passes.

**Do NOT:**
- Modify any file under `backend/`.
- Hardcode the specializations list (always fetch from `/specializations`).
- Show admin login link from any public page.
- Persist tokens anywhere except `localStorage`.
- Change API paths or payload shapes.

---

## 12. Reference: existing backend files (read-only)

If anything is ambiguous, the backend is the source of truth. Inspect:

- `backend/app/main.py` — router prefixes
- `backend/app/api/v1/*.py` — route signatures
- `backend/app/schemas/*.py` — request / response shapes
- `backend/app/models/*.py` — enums and field constraints
- Swagger UI: `http://localhost:8000/api/docs`

---

End of spec. Build something the user will love.
