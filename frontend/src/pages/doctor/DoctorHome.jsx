import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { sessionApi } from "../../api";
import StatCard from "../../components/StatCard";
import StatusBadge from "../../components/StatusBadge";
import Ico from "../../components/Ico";

export default function DoctorHome() {
  const navigate = useNavigate();
  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["today-sessions"],
    queryFn: () => sessionApi.today().then(r => r.data),
  });

  const handleStart = async (sessionId) => {
    try {
      await sessionApi.start(sessionId);
      navigate(`/doctor/session/${sessionId}`);
    } catch (err) {
      navigate(`/doctor/session/${sessionId}`);
    }
  };

  const totalToday = sessions.reduce((s, sess) => s + (sess.booked_count || 0), 0);

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Doctor Portal</div>
        <h1 style={{ fontSize: 26, fontWeight: 850, letterSpacing: "-.02em" }}>Today's Sessions</h1>
        <p style={{ fontSize: 13, color: "var(--ink-mute)", marginTop: 4 }}>
          {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} — {totalToday} patients scheduled today.
        </p>
      </div>

      <div className="grid-4">
        <StatCard icon="calendar" iconClass="icon-blue" label="Sessions Today" value={sessions.length} />
        <StatCard icon="users" iconClass="icon-mint" label="Patients Today" value={totalToday} />
        <StatCard icon="checkCircle" iconClass="icon-violet" label="Active Now" value={sessions.filter((s) => s.status === "active").length} />
        <StatCard icon="clock" iconClass="icon-amber" label="Avg. Slot Duration" value={sessions.length ? `${Math.round(sessions.reduce((a, s) => a + (s.slot_duration_mins || 0), 0) / sessions.length)} min` : "—"} />
      </div>

      <div className="card card-p">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ fontWeight: 700 }}>Today's Sessions</div>
          <button className="btn btn-secondary btn-sm" type="button" onClick={() => navigate("/doctor/today")}>
            View all
          </button>
        </div>

        {isLoading ? (
          <div>Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="card">
            <div className="card-p">No sessions scheduled for today.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sessions.map((sess) => (
              <div
                key={sess.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "14px 16px",
                  background: "var(--muted)",
                  borderRadius: 14,
                  border: `1px solid ${sess.status === "active" ? "rgba(5,150,105,.3)" : "var(--border)"}`,
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: sess.status === "active" ? "rgba(5,150,105,.12)" : "rgba(26,127,230,.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Ico n={sess.status === "active" ? "activity" : "clock"} size={20} color={sess.status === "active" ? "var(--mint)" : "var(--brand-500)"} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 650, fontSize: 14 }}>{sess.start_time?.slice(0, 5)} – {sess.end_time?.slice(0, 5)}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>
                    {(sess.booked_count ?? 0)} / {sess.max_patients} patients · {sess.slot_duration_mins} min slots
                  </div>
                </div>
                <StatusBadge status={sess.status} />
                <button
                  className={`btn btn-sm ${sess.status === "active" ? "btn-mint" : "btn-primary"}`}
                  type="button"
                  onClick={() => handleStart(sess.id)}
                >
                  <Ico n={sess.status === "active" ? "activity" : "play"} size={13} /> {sess.status === "active" ? "Resume" : "Start"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
