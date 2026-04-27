import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api";
import { Save } from "lucide-react";
import toast from "react-hot-toast";

const TERMS_DEFAULT = `APPOINTMENT TERMS & CONDITIONS

1. CANCELLATION POLICY
   - Full refund: Cancel 24+ hours before appointment
   - 50% refund: Cancel within 24 hours of appointment
   - No refund: No-shows or same-day cancellations

2. RESCHEDULING
   Rescheduling is permitted up to 12 hours before the appointment.

3. PATIENT RESPONSIBILITIES
   - Arrive 10 minutes before scheduled time
   - Bring relevant medical documents

4. DATA USAGE
   Your medical information is stored securely and used only for your care.

5. NO-SHOW POLICY
   Repeated no-shows may result in suspension from the booking system.`;

export default function AdminSettings() {
  const qc = useQueryClient();
  const { data: settings = {} } = useQuery({ queryKey: ["admin-settings"], queryFn: () => adminApi.settings().then(r => r.data) });
  const [termsText, setTermsText] = useState("");
  const [cancelHours, setCancelHours] = useState(24);

  const { mutate: saveTerms } = useMutation({
    mutationFn: () => adminApi.updateSetting("terms_and_conditions", { text: termsText }),
    onSuccess: () => toast.success("Terms saved!"),
  });

  const { mutate: savePolicy } = useMutation({
    mutationFn: () => adminApi.updateSetting("cancellation_policy", { full_refund_hours: cancelHours }),
    onSuccess: () => toast.success("Policy saved!"),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div><h1 className="text-3xl font-bold text-fg mb-1">System Settings</h1><p className="text-fg-subtle text-sm">Manage T&C, cancellation policy, and system configuration</p></div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-semibold text-fg">Terms & Conditions</h3>
        <p className="text-fg-subtle text-xs">This text is shown to patients before booking an appointment.</p>
        <textarea value={termsText || settings?.terms_and_conditions?.text || TERMS_DEFAULT}
          onChange={e => setTermsText(e.target.value)}
          className="input-field font-mono text-xs" rows={18} />
        <button onClick={() => saveTerms()} className="btn-primary"><Save size={16} />Save Terms</button>
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="font-semibold text-fg">Cancellation Policy Parameters</h3>
        <div>
          <label className="input-label">Full Refund Window (hours before appointment)</label>
          <input type="number" value={cancelHours} onChange={e => setCancelHours(Number(e.target.value))}
            className="input-field w-32" min={0} max={168} />
          <p className="text-xs text-fg-subtle mt-1">Patients cancelling ≥{cancelHours}h beforehand receive full refund. 0–{cancelHours}h = partial refund. No-show = no refund.</p>
        </div>
        <button onClick={() => savePolicy()} className="btn-primary"><Save size={16} />Save Policy</button>
      </div>
    </div>
  );
}
