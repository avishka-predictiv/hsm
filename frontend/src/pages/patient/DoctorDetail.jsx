import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { doctorApi } from "../../api";
import Avatar from "../../components/Avatar";
import Ico from "../../components/Ico";
import StatusBadge from "../../components/StatusBadge";
import EmptyState from "../../components/EmptyState";

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function fmtTime(t) {
  if (!t) return "";
  return t.slice(0, 5);
}

function formatCurrencyLKR(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(Number(n));
}

export default function DoctorDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [tab, setTab] = useState("about");

  const { data: doctor, isLoading } = useQuery({
    queryKey: ["doctor", id],
    queryFn: () => doctorApi.get(id).then((r) => r.data),
    enabled: !!id,
  });

  const { data: availability = [] } = useQuery({
    queryKey: ["doctor-availability", id],
    queryFn: () => doctorApi.availability(id).then((r) => r.data),
    enabled: !!id,
  });

  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of availability) {
      const key = s.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    }
    return Array.from(map.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  }, [availability]);

  if (isLoading) return <div className="card card-p">Loading…</div>;
  if (!doctor) return <div className="card"><EmptyState icon="user" title="Doctor not found" desc="This profile may have been removed." /></div>;

  const name = doctor.email ? doctor.email.split("@")[0].replace(/\./g, " ") : "Doctor";

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button className="btn-ghost btn-icon" type="button" onClick={() => navigate("/patient/doctors")} aria-label="Back">
          <Ico n="arrowLeft" size={18} />
        </button>
        <span style={{ fontSize: 13, color: "var(--ink-mute)" }}>Back to Find Doctors</span>
      </div>

      <div className="card card-p" style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        <div style={{ position: "relative" }}>
          <Avatar name={name} email={doctor.email} size={80} radius={20} />
          {doctor.is_verified ? (
            <div style={{ position: "absolute", bottom: -4, right: -4, width: 22, height: 22, borderRadius: "50%", background: "var(--mint)", display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--panel)" }}>
              <Ico n="check" size={11} color="#fff" />
            </div>
          ) : null}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800 }}>{name}</h2>
            <StatusBadge status={doctor.is_verified ? "verified" : "unverified"} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
            {(doctor.specializations || []).map((s) => (
              <span key={s.id} className="badge badge-blue">
                {s.name}
              </span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 24, fontSize: 13, color: "var(--ink-mute)", flexWrap: "wrap" }}>
            <span>
              <Ico n="clock" size={13} color="var(--ink-dim)" style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
              {doctor.years_experience ?? "—"} years experience
            </span>
            <span>
              <Ico n="dollarSign" size={13} color="var(--ink-dim)" style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }} />
              {formatCurrencyLKR(doctor.consultation_fee)} per visit
            </span>
          </div>
        </div>
      </div>

      <div className="tab-bar">
        {["about", "availability"].map((t) => (
          <button key={t} className={`tab ${tab === t ? "active" : ""}`} type="button" onClick={() => setTab(t)}>
            {t === "about" ? "About" : "Availability"}
          </button>
        ))}
      </div>

      {tab === "about" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
          <div className="card card-p" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Biography</div>
              <p style={{ fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.7 }}>{doctor.bio || "—"}</p>
            </div>
            <hr className="divider" />
            <div>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Qualifications</div>
              <p style={{ fontSize: 14, color: "var(--ink-soft)" }}>{doctor.qualifications || "—"}</p>
            </div>
          </div>
          <div className="card card-p">
            <div className="eyebrow" style={{ marginBottom: 12 }}>Consultation Info</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Registration", doctor.reg_number],
                ["Fee", formatCurrencyLKR(doctor.consultation_fee)],
                ["Experience", doctor.years_experience != null ? `${doctor.years_experience} years` : "—"],
                ["Affiliation", doctor.affiliation],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13 }}>
                  <span style={{ color: "var(--ink-mute)" }}>{k}</span>
                  <span style={{ fontWeight: 600, textAlign: "right" }}>{v || "—"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card card-p">
          <div className="eyebrow" style={{ marginBottom: 16 }}>Available Sessions</div>
          {grouped.length === 0 ? (
            <EmptyState icon="calendar" title="No upcoming sessions" desc="This doctor has no available sessions right now." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {grouped.map(([date, sessions]) => (
                <div key={date} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ fontWeight: 650, color: "var(--ink-soft)" }}>{fmtDate(date)}</div>
                  {sessions.map((s) => (
                    <div
                      key={s.session_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 16,
                        padding: "14px 16px",
                        background: "var(--muted)",
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ width: 52, height: 52, borderRadius: 12, background: "var(--panel)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <div style={{ fontSize: 10, fontWeight: 650, color: "var(--brand-500)", textTransform: "uppercase" }}>
                          {new Date(date).toLocaleString("en", { month: "short" })}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 850, lineHeight: 1.1 }}>{new Date(date).getDate()}</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 650, fontSize: 14 }}>{fmtTime(s.start_time)} – {fmtTime(s.end_time)}</div>
                        <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                          {s.slot_duration_mins} min slots · max {s.max_patients} patients
                        </div>
                      </div>
                      <button className="btn btn-primary btn-sm" type="button" onClick={() => navigate(`/patient/book/${s.session_id}`, { state: { consultation_fee: doctor.consultation_fee } })}>
                        Book
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

