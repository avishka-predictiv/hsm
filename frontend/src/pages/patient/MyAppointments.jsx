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
        <div className="card" style={{ overflow: "hidden" }}>
          {data.map((a) => (
            <div key={a.id} className="list-item" style={{ flexWrap: "wrap", gap: 10 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "rgba(26,127,230,.08)",
                  border: "1px solid rgba(26,127,230,.15)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div style={{ fontSize: 9, fontWeight: 650, color: "var(--brand-500)", textTransform: "uppercase" }}>
                  {fmtDate(a.booked_at).split(" ")[1] || ""}
                </div>
                <div style={{ fontSize: 18, fontWeight: 850, lineHeight: 1 }}>{fmtDate(a.booked_at).split(" ")[0] || ""}</div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 650, fontSize: 14 }}>Slot #{a.slot_number}</div>
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>{fmtDate(a.booked_at)}</div>
                {a.symptoms_text ? (
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 480 }}>
                    {a.symptoms_text}
                  </div>
                ) : null}
              </div>

              <StatusBadge status={a.status} />

              {tab === "upcoming" ? (
                <button
                  type="button"
                  className="btn btn-sm"
                  style={{ background: "rgba(244,63,94,.07)", color: "var(--rose)", border: "1px solid rgba(244,63,94,.15)", flexShrink: 0 }}
                  onClick={() => setCancel({ id: a.id, reason: "" })}
                >
                  <Ico n="x" size={12} color="var(--rose)" /> Cancel
                </button>
              ) : null}
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

