import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { appointmentApi, paymentApi, sessionApi } from "../../api";
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
  const [attachments, setAttachments] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [lastAppointment, setLastAppointment] = useState(null);

  const { data: slots = [] } = useQuery({
    queryKey: ["session-slots", sessionId],
    queryFn: () => appointmentApi.slots(sessionId).then((r) => r.data),
    enabled: !!sessionId,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const { data: sessionInfo } = useQuery({
    queryKey: ["session-info", sessionId],
    queryFn: () => sessionApi.info(sessionId).then((r) => r.data),
    enabled: !!sessionId,
  });

  const fee = sessionInfo?.consultation_fee ?? 0;
  const hasAvailable = slots.some((s) => s.is_available);
  const nextSlot = slots.find((s) => s.is_available)?.slot_number ?? null;

  const handleAttachmentsChange = (event) => {
    const newFiles = Array.from(event.target.files || []);
    setAttachments((current) => {
      const combined = [...current, ...newFiles];
      const seen = new Set();
      return combined.filter((file) => {
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
  };

  const removeAttachment = (index) => {
    setAttachments((current) => current.filter((_, i) => i !== index));
  };

  const bookMutation = useMutation({
    mutationFn: () =>
      appointmentApi.book({
        session_id: sessionId,
        symptoms_text: symptoms.trim() || null,
        terms_accepted: true,
      }).then((r) => r.data),
    onSuccess: async (appt) => {
      setLastAppointment(appt);
      setShowPayModal(true);
      qc.invalidateQueries({ queryKey: ["upcoming-appts"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
      qc.invalidateQueries({ queryKey: ["session-slots", sessionId] });

      if (attachments.length > 0) {
        try {
          await appointmentApi.uploadAttachment(appt.id, attachments);
          toast.success("Uploaded medical reports successfully");
        } catch {
          toast.error("Some files could not be uploaded");
        }
      }
    },
    onError: (e) => {
      toast.error(e?.response?.data?.detail || "Booking failed");
    },
  });

  const payMutation = useMutation({
    mutationFn: () => paymentApi.create({ appointment_id: lastAppointment.id, amount: fee, method: "mock" }).then((r) => r.data),
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

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div className="card card-p">
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Booked by order of arrival</div>
          <p style={{ fontSize: 13, color: "var(--ink-mute)", marginBottom: 14 }}>
            The system assigns the next available slot automatically. Patients cannot change the slot number.
          </p>

          {slots.length === 0 ? (
            <EmptyState icon="calendar" title="No slots available" desc="Try another session." />
          ) : (
            <div className="slot-grid">
              {slots.map((s) => (
                <div
                  key={s.slot_number}
                  className={`slot ${s.is_available ? "slot-available" : "slot-booked"} ${s.slot_number === nextSlot ? "slot-selected" : ""}`}
                  title={s.is_available ? `Slot #${s.slot_number} at ${s.start_time}` : "Booked"}
                  style={{ cursor: "default" }}
                >
                  <span style={{ fontSize: 15, fontWeight: 800 }}>#{s.slot_number}</span>
                  <span style={{ fontSize: 10, marginTop: 2 }}>{s.start_time}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card card-p">
          <div style={{ fontWeight: 700, marginBottom: 14 }}>Consultation Details</div>

          {fee > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(26,127,230,.07)", border: "1px solid rgba(26,127,230,.18)", borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
              <span style={{ fontSize: 13, color: "var(--ink-mute)" }}>Consultation Fee</span>
              <span style={{ fontSize: 15, fontWeight: 750, color: "var(--brand-500)" }}>{formatCurrencyLKR(fee)}</span>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <label className="label">Symptoms / Reason for visit</label>
            <textarea className="input" rows={5} placeholder="Describe your symptoms…" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label className="label">Upload lab reports, scans, X-rays, or other medical files</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.txt"
              multiple
              onChange={handleAttachmentsChange}
              className="input"
              style={{ paddingTop: 10, paddingBottom: 10 }}
            />
            {attachments.length > 0 ? (
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {attachments.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--muted)",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "var(--ink)" }}>{file.name}</span>
                    <button
                      type="button"
                      className="btn-ghost btn-icon"
                      onClick={() => removeAttachment(index)}
                      aria-label={`Remove ${file.name}`}
                    >
                      <Ico n="x" size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ marginTop: 10, fontSize: 12, color: "var(--ink-mute)" }}>
                Add medical reports or imaging files to help the doctor review your case faster.
              </p>
            )}
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
          {nextSlot ? (
            <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 8 }}>
              Your assigned slot will be <strong>#{nextSlot}</strong>.
            </p>
          ) : (
            <p style={{ fontSize: 12, color: "var(--ink-mute)", marginTop: 8 }}>
              No available slots remain for this session.
            </p>
          )}
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
                <span style={{ fontWeight: 750, color: "var(--brand-500)" }}>{formatCurrencyLKR(fee)}</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%", justifyContent: "center", padding: "12px" }}
              disabled={payMutation.isPending}
              onClick={() => payMutation.mutate()}
            >
              Pay {formatCurrencyLKR(fee)}
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}
