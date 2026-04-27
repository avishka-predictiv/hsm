import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { appointmentApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import StatCard from "../../components/StatCard";
import EmptyState from "../../components/EmptyState";
import Ico from "../../components/Ico";
import StatusBadge from "../../components/StatusBadge";

function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

export default function PatientHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: upcoming = [] } = useQuery({ queryKey: ["upcoming-appts"], queryFn: () => appointmentApi.upcoming().then((r) => r.data) });
  const { data: history = [] } = useQuery({ queryKey: ["appt-history"], queryFn: () => appointmentApi.history().then((r) => r.data) });
  const next = upcoming[0];

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Patient Portal</div>
        <h1 style={{ fontSize: 26, fontWeight: 850, letterSpacing: "-.02em" }}>Welcome back</h1>
        <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 4 }}>{user?.email}</p>
      </div>

      <div className="grid-4">
        <StatCard icon="calendar" iconClass="icon-blue" label="Upcoming Appointments" value={upcoming.length} />
        <StatCard icon="checkCircle" iconClass="icon-mint" label="Past Consultations" value={history.length} />
        <StatCard icon="creditCard" iconClass="icon-violet" label="Payments" value="—" sub="Mock payments supported" />
        <StatCard icon="activity" iconClass="icon-amber" label="Profile" value={user?.profile_complete ? "Complete" : "Incomplete"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <div className="card card-p">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontWeight: 700 }}>Next Appointment</div>
            <button className="btn btn-secondary btn-sm" type="button" onClick={() => navigate("/patient/appointments")}>
              View all
            </button>
          </div>
          {next ? (
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 60, height: 60, borderRadius: 14, flexShrink: 0, background: "rgba(26,127,230,.08)", border: "1px solid rgba(26,127,230,.15)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontSize: 11, fontWeight: 650, color: "var(--brand-500)" }}>{fmtDate(next.booked_at).split(" ")[1] || ""}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: "var(--ink)", lineHeight: 1.1 }}>{fmtDate(next.booked_at).split(" ")[0] || ""}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 750, fontSize: 16 }}>Slot #{next.slot_number}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-mute)" }}>{fmtDate(next.booked_at)}</div>
                <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
                  <StatusBadge status={next.status} />
                </div>
                {next.symptoms_text ? (
                  <div style={{ marginTop: 10, background: "rgba(217,119,6,.07)", border: "1px solid rgba(217,119,6,.18)", borderRadius: 11, padding: "10px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <Ico n="alertCircle" size={14} color="var(--amber)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                      <strong style={{ color: "var(--amber)" }}>Symptoms: </strong>{next.symptoms_text}
                    </div>
                  </div>
                ) : null}
                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={() => navigate("/patient/appointments")}>
                    <Ico n="eye" size={13} /> View details
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <EmptyState icon="calendar" title="No upcoming appointments" desc="Book a consultation with a doctor." action="Find Doctors" onAction={() => navigate("/patient/doctors")} />
          )}
        </div>

        <div className="card card-p">
          <div style={{ fontWeight: 700, marginBottom: 14 }}>Quick Actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { icon: "search", color: "var(--brand-500)", label: "Find a Doctor", sub: "Browse verified specialists", to: "/patient/doctors" },
              { icon: "fileText", color: "var(--mint)", label: "Medical History", sub: "View past consultations", to: "/patient/history" },
              { icon: "creditCard", color: "var(--violet)", label: "Payments", sub: "Billing history and receipts", to: "/patient/payments" },
              { icon: "user", color: "var(--amber)", label: "My Profile", sub: "Personal and medical information", to: "/patient/profile" },
            ].map((a) => (
              <button
                key={a.to}
                type="button"
                onClick={() => navigate(a.to)}
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", borderRadius: 12, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", transition: "background 120ms" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--muted)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${a.color}14`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Ico n={a.icon} size={16} color={a.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{a.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-mute)" }}>{a.sub}</div>
                </div>
                <Ico n="chevronRight" size={14} color="var(--ink-dim)" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
