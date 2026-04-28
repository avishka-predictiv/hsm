import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import ThemeToggle from "../../components/ThemeToggle";
import Ico from "../../components/Ico";
import { authApi } from "../../api";
import toast from "react-hot-toast";

const GOOGLE_AUTH_URL = (role) =>
  `${import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"}/auth/google?role=${role}`;

function FeatureCard({ icon, color, title, desc }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        alignItems: "flex-start",
        padding: "14px 16px",
        background: "var(--panel)",
        borderRadius: 14,
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Ico n={icon} size={17} color={color} />
      </div>
      <div>
        <div style={{ fontWeight: 650, fontSize: 13, marginBottom: 2, color: "var(--ink)" }}>{title}</div>
        <div style={{ fontSize: 12, color: "var(--ink-mute)", lineHeight: 1.5 }}>{desc}</div>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user, loginWithTokens } = useAuth();
  const [activeTab, setActiveTab] = useState("patient");
  const [mode, setMode] = useState("login"); // login | signup
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { email: form.email, password: form.password, role: activeTab };
      const { data } = mode === "signup" ? await authApi.register(payload) : await authApi.login(payload);
      loginWithTokens(data.access_token, data.refresh_token, data.user);
      toast.success(mode === "signup" ? "Account created!" : "Welcome back!");
      if (!data.user?.profile_complete) {
        navigate("/complete-profile", { state: { role: activeTab }, replace: true });
      } else {
        navigate(activeTab === "doctor" ? "/doctor" : "/patient", { replace: true });
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="hero-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, position: "relative" }}>
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 20 }}>
        <ThemeToggle />
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 1080, display: "grid", gridTemplateColumns: "1fr 440px", gap: 72, alignItems: "center" }}>
        {/* Left */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <div style={{ width: 44, height: 44, borderRadius: 11, background: "linear-gradient(135deg, var(--brand-500), var(--brand-700))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(26,109,181,0.3)" }}>
              <Ico n="hospital" size={24} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-.02em", color: "var(--ink)" }}>HMS</div>
              <div style={{ fontSize: 11, color: "var(--ink-mute)", marginTop: 1 }}>Hospital Management System</div>
            </div>
          </div>

          <h1 style={{ fontSize: 44, fontWeight: 850, letterSpacing: "-.04em", lineHeight: 1.1, marginBottom: 18, color: "var(--ink)" }}>
            Better care,<br />
            <span style={{ color: "var(--brand-500)" }}>better outcomes.</span>
          </h1>
          <p style={{ fontSize: 16, color: "var(--ink-soft)", lineHeight: 1.7, marginBottom: 40, maxWidth: 460 }}>
            A unified platform connecting patients with their doctors. Schedule appointments, access medical records, and manage care — all in one secure place.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <FeatureCard icon="calendar" color="var(--brand-500)" title="Slot-based Scheduling" desc="Real-time availability across all specialties" />
            <FeatureCard icon="shield" color="var(--mint)" title="Secure Medical Records" desc="Role-based access with full audit logging" />
            <FeatureCard icon="users" color="var(--violet)" title="Three-role Platform" desc="Patients, doctors, and administrators" />
            <FeatureCard icon="heartPulse" color="var(--rose)" title="Live Consultations" desc="Doctors manage queue and record diagnoses live" />
          </div>
        </div>

        {/* Right: auth card */}
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: 34, boxShadow: "var(--shadow-lg)" }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 20, fontWeight: 750, marginBottom: 5, color: "var(--ink)" }}>Sign in to HMS</div>
            <div style={{ fontSize: 13, color: "var(--ink-mute)", lineHeight: 1.5 }}>
              Select your role. Use email & password or continue with Google.
            </div>
          </div>

          <div style={{ display: "flex", background: "var(--muted)", borderRadius: 10, padding: 3, marginBottom: 24 }}>
            {["patient", "doctor"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setActiveTab(r)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 650,
                  border: "none",
                  cursor: "pointer",
                  transition: "all 140ms",
                  background: activeTab === r ? "var(--panel)" : "transparent",
                  color: activeTab === r ? "var(--ink)" : "var(--ink-mute)",
                  boxShadow: activeTab === r ? "var(--shadow-xs)" : "none",
                }}
              >
                {r === "patient" ? "Patient" : "Doctor"}
              </button>
            ))}
          </div>

          <div style={{ background: "var(--muted)", borderRadius: 10, padding: "10px 14px", marginBottom: 22, fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
            {activeTab === "patient"
              ? "Book appointments, view medical history, and manage your health records."
              : "Manage your schedule, run live consultation sessions, and record diagnoses."}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {["login", "signup"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={m === mode ? "btn btn-primary" : "btn btn-secondary"}
                style={{ flex: 1, justifyContent: "center" }}
              >
                {m === "login" ? "Login" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-3" style={{ marginBottom: 14 }}>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" required value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} placeholder="••••••••" />
            </div>
            <button type="submit" className="btn btn-mint" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
              {loading ? (mode === "signup" ? "Creating..." : "Signing in...") : (mode === "signup" ? "Create account" : "Sign in")}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0 14px" }}>
            <div style={{ height: 1, background: "var(--border)", flex: 1 }} />
            <div style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>OR</div>
            <div style={{ height: 1, background: "var(--border)", flex: 1 }} />
          </div>

          <a
            href={GOOGLE_AUTH_URL(activeTab)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              width: "100%",
              padding: "11px 16px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--muted)",
              fontSize: 13.5,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 140ms",
              marginBottom: 14,
              color: "var(--ink)",
            }}
          >
            <svg viewBox="0 0 24 24" width={18} height={18} aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue as {activeTab === "patient" ? "Patient" : "Doctor"} with Google
          </a>

          <p style={{ textAlign: "center", fontSize: 11.5, color: "var(--ink-mute)", marginBottom: 20, lineHeight: 1.6 }}>
            By signing in you agree to our <span style={{ color: "var(--brand-500)" }}>Terms of Service</span> and <span style={{ color: "var(--brand-500)" }}>Privacy Policy</span>
          </p>

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>Healthcare administrator?</span>
            <a href="/admin-login" style={{ fontSize: 12, color: "var(--brand-500)", fontWeight: 650 }}>
              Admin portal →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
