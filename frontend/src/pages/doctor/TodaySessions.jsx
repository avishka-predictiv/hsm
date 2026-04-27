import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { sessionApi } from "../../api";
import PageHeader from "../../components/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import Ico from "../../components/Ico";
import toast from "react-hot-toast";

export default function TodaySessions() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["today-sessions"],
    queryFn: () => sessionApi.today().then((r) => r.data),
  });

  const startMutation = useMutation({
    mutationFn: (id) => sessionApi.start(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["today-sessions"] });
      navigate(`/doctor/session/${id}`);
    },
    onError: (_, id) => navigate(`/doctor/session/${id}`),
  });

  const endMutation = useMutation({
    mutationFn: (id) => sessionApi.end(id),
    onSuccess: () => {
      toast.success("Session ended");
      qc.invalidateQueries({ queryKey: ["today-sessions"] });
    },
    onError: () => toast.error("Failed to end session"),
  });

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Today's Sessions"
        subtitle={`${new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} — ${sessions.length} sessions`}
      />

      {isLoading ? (
        <div className="card card-p">Loading…</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {sessions.map((sess) => (
            <div key={sess.id} className="card card-p">
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    flexShrink: 0,
                    background: sess.status === "active" ? "rgba(5,150,105,.1)" : "rgba(26,127,230,.08)",
                    border: `1px solid ${sess.status === "active" ? "rgba(5,150,105,.25)" : "rgba(26,127,230,.15)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ico n={sess.status === "active" ? "activity" : "clock"} size={22} color={sess.status === "active" ? "var(--mint)" : "var(--brand-500)"} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 750, fontSize: 16 }}>{sess.start_time?.slice(0, 5)} – {sess.end_time?.slice(0, 5)}</span>
                    <StatusBadge status={sess.status} />
                  </div>
                  <div style={{ fontSize: 13, color: "var(--ink-mute)" }}>
                    {(sess.booked_count ?? 0)} / {sess.max_patients} patients booked · {sess.slot_duration_mins} min per slot
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  {sess.status === "scheduled" ? (
                    <button className="btn btn-primary btn-sm" type="button" onClick={() => startMutation.mutate(sess.id)} disabled={startMutation.isPending}>
                      <Ico n="play" size={13} /> Start Session
                    </button>
                  ) : null}
                  {sess.status === "active" ? (
                    <>
                      <button className="btn btn-mint btn-sm" type="button" onClick={() => navigate(`/doctor/session/${sess.id}`)}>
                        <Ico n="activity" size={13} /> Resume
                      </button>
                      <button className="btn btn-danger btn-sm" type="button" onClick={() => endMutation.mutate(sess.id)} disabled={endMutation.isPending}>
                        <Ico n="stopCircle" size={13} /> End
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          {sessions.length === 0 ? <div className="card card-p">No sessions scheduled for today.</div> : null}
        </div>
      )}
    </div>
  );
}

