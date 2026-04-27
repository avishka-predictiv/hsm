import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appointmentApi, doctorApi, paymentApi, sessionApi } from "../../api";
import Avatar from "../../components/Avatar";
import Ico from "../../components/Ico";
import Modal from "../../components/Modal";
import EmptyState from "../../components/EmptyState";
import toast from "react-hot-toast";

function formatCurrencyLKR(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(Number(n));
}

export default function BookAppointment() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { sessionId } = useParams();
  const [symptoms, setSymptoms] = useState("");
  const [terms, setTerms] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [lastAppointment, setLastAppointment] = useState(null);

  const { data: slots = [] } = useQuery({
    queryKey: ["session-slots", sessionId],
    queryFn: () => appointmentApi.slots(sessionId).then((r) => r.data),
    enabled: !!sessionId,
  });

  // We don't have a session details endpoint; we show slot info + basic copy.
  const hasAvailable = slots.some((s) => s.is_available);

  const bookMutation = useMutation({
    mutationFn: () =>
      appointmentApi.book({
        session_id: sessionId,
        symptoms_text: symptoms.trim() || null,
        terms_accepted: true,
      }).then((r) => r.data),
    onSuccess: (appt) => {
      setLastAppointment(appt);
      setShowPayModal(true);
      qc.invalidateQueries({ queryKey: ["upcoming-appts"] });
    },
    onError: (e) => {
      toast.error(e?.response?.data?.detail || "Booking failed");
    },
  });

  const payMutation = useMutation({
    mutationFn: () => paymentApi.create({ appointment_id: lastAppointment.id, amount: 0, method: "mock" }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Payment successful");
      setShowPayModal(false);
      qc.invalidateQueries({ queryKey: ["payments"] });
      navigate("/patient/appointments");
    },
    onError: () => toast.error("Payment failed"),
  });

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button className="btn-ghost btn-icon" type="button" onClick={() => navigate(-1)} aria-label="Back">
          <Ico n="arrowLeft" size={18} />
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 3 }}>Book Appointment</h1>
          <p style={{ fontSize: 13, color: "var(--ink-mute)" }}>Choose an available slot and confirm terms.</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 24 }}>
        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card card-p">
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Select a Slot</div>
            <p style={{ fontSize: 13, color: "var(--ink-mute)", marginBottom: 14 }}>
              Greyed slots are taken. The backend will assign the next available slot at booking time.
            </p>

            {slots.length === 0 ? (
              <EmptyState icon="calendar" title="No slots available" desc="Try another session." />
            ) : (
              <div className="slot-grid">
                {slots.map((s) => (
                  <div
                    key={s.slot_number}
                    className={`slot ${s.is_available ? "slot-available" : "slot-booked"}`}
                    title={s.is_available ? `Slot #${s.slot_number} at ${s.start_time}` : "Booked"}
                  >
                    <span style={{ fontSize: 15, fontWeight: 800 }}>#{s.slot_number}</span>
                    <span style={{ fontSize: 10, marginTop: 2 }}>{s.start_time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card card-p">
            <div style={{ fontWeight: 700, marginBottom: 14 }}>Consultation Details</div>
            <div style={{ marginBottom: 14 }}>
              <label className="label">Symptoms / Reason for visit</label>
              <textarea className="input" rows={5} placeholder="Describe your symptoms…" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
            </div>

            <div
              style={{
                background: "var(--muted)",
                borderRadius: 12,
                padding: "12px 14px",
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                marginBottom: 16,
                border: `2px solid ${terms ? "rgba(5,150,105,.35)" : "var(--border)"}`,
                transition: "border-color 150ms",
              }}
            >
              <button
                type="button"
                className="btn-ghost btn-icon"
                onClick={() => setTerms((t) => !t)}
                aria-pressed={terms}
                aria-label="Toggle terms acceptance"
              >
                <Ico n={terms ? "checkCircle" : "circle"} size={18} color={terms ? "var(--mint)" : "var(--ink-mute)"} />
              </button>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>I accept the Terms &amp; Conditions</div>
                <div style={{ fontSize: 12, color: "var(--ink-mute)" }}>Cancellations within 24 hours may not be eligible for a full refund.</div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "12px", opacity: terms && hasAvailable ? 1 : 0.55 }}
              disabled={!terms || !hasAvailable || bookMutation.isPending}
              onClick={() => bookMutation.mutate()}
            >
              <Ico n="calendar" size={15} /> Confirm &amp; Proceed to Payment
            </button>
          </div>
        </div>
      </div>

      <Modal open={showPayModal} onClose={() => setShowPayModal(false)} title="Complete Payment">
        {!lastAppointment ? null : (
          <>
            <div style={{ background: "var(--muted)", borderRadius: 14, padding: 16, marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: "var(--ink-mute)" }}>Appointment</span>
                <span style={{ fontWeight: 600 }}>Slot #{lastAppointment.slot_number}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ color: "var(--ink-mute)" }}>Total</span>
                <span style={{ fontWeight: 750, color: "var(--brand-500)" }}>{formatCurrencyLKR(0)}</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "12px" }}
              disabled={payMutation.isPending}
              onClick={() => payMutation.mutate()}
            >
              Pay {formatCurrencyLKR(0)}
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}

