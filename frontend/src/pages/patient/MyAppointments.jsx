import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appointmentApi } from "../../api";
import PageHeader from "../../components/PageHeader";
import StatusBadge from "../../components/StatusBadge";
import Modal from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import Ico from "../../components/Ico";
import toast from "react-hot-toast";

function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

function fmtDay(s) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("en-GB", { day: "2-digit" });
  } catch {
    return "";
  }
}

function fmtMonth(s) {
  if (!s) return "";
  try {
    return new Date(s).toLocaleDateString("en-GB", { month: "short" });
  } catch {
    return "";
  }
}

export default function MyAppointments() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("upcoming");
  const [cancel, setCancel] = useState(null); // { id, reason }

  const { data: upcoming = [], isLoading: loadingUpcoming } = useQuery({
    queryKey: ["upcoming-appts"],
    queryFn: () => appointmentApi.upcoming().then((r) => r.data),
  });
  const { data: history = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["appt-history"],
    queryFn: () => appointmentApi.history().then((r) => r.data),
  });

  const data = tab === "upcoming" ? upcoming : history;

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => appointmentApi.cancel(id, { reason: reason || null }).then((r) => r.data),
    onSuccess: (res) => {
      toast.success(`Appointment cancelled (${res.refund_policy.replace(/_/g, " ")})`);
      setCancel(null);
      qc.invalidateQueries({ queryKey: ["upcoming-appts"] });
      qc.invalidateQueries({ queryKey: ["appt-history"] });
    },
    onError: (e) => toast.error(e?.response?.data?.detail || "Cancel failed"),
  });

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="My Appointments"
        subtitle="Track your upcoming and past consultations"
      />

      <div className="tab-bar">
        <button className={`tab ${tab === "upcoming" ? "active" : ""}`} type="button" onClick={() => setTab("upcoming")}>
          Upcoming ({upcoming.length})
        </button>
        <button className={`tab ${tab === "history" ? "active" : ""}`} type="button" onClick={() => setTab("history")}>
          Past ({history.length})
        </button>
      </div>

      {(tab === "upcoming" ? loadingUpcoming : loadingHistory) ? (
        <div className="card card-p">Loading…</div>
      ) : data.length === 0 ? (
        <div className="card">
          <EmptyState icon="calendar" title="No appointments" desc="You haven't booked any appointments yet." />
        </div>
      ) : (
        <div className="appointment-list">
          {data.map((a) => (
            <div key={a.id} className="appointment-card">
              <div className="appointment-card__date">
                <div className="appointment-card__day">{fmtDay(a.booked_at)}</div>
                <div className="appointment-card__month">{fmtMonth(a.booked_at)}</div>
              </div>

              <div className="appointment-card__content">
                <div className="appointment-card__header">
                  <div>
                    <div className="appointment-card__title">Slot #{a.slot_number}</div>
                    <div className="appointment-card__meta">Booked on {fmtDate(a.booked_at)}</div>
                  </div>
                  <div className="appointment-card__status-actions">
                    <StatusBadge status={a.status} />
                    {tab === "upcoming" ? (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger-outline"
                        onClick={() => setCancel({ id: a.id, reason: "" })}
                      >
                        <Ico n="x" size={12} color="var(--rose)" /> Cancel
                      </button>
                    ) : null}
                  </div>
                </div>

                {a.symptoms_text ? (
                  <div className="appointment-card__notes">{a.symptoms_text}</div>
                ) : (
                  <div className="appointment-card__notes appointment-card__notes--muted">No symptoms provided</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!cancel} onClose={() => setCancel(null)} title="Cancel Appointment">
        <div style={{ padding: "4px 0 18px", fontSize: 14, color: "var(--ink-soft)" }}>
          Are you sure you want to cancel this appointment? Refund depends on timing.
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="label">Reason (optional)</label>
          <textarea className="input" placeholder="Let us know why you're cancelling…" value={cancel?.reason || ""} onChange={(e) => setCancel((p) => ({ ...p, reason: e.target.value }))} />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className="btn btn-secondary" style={{ flex: 1, justifyContent: "center" }} onClick={() => setCancel(null)}>
            Keep it
          </button>
          <button
            type="button"
            className="btn btn-danger"
            style={{ flex: 1, justifyContent: "center" }}
            disabled={cancelMutation.isPending}
            onClick={() => cancel && cancelMutation.mutate({ id: cancel.id, reason: cancel.reason })}
          >
            Yes, cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}

