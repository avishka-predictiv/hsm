import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sessionApi } from "../../api";
import { ArrowLeft, ArrowRight, Save, CheckCircle, User, FileText, Calendar, X, StopCircle } from "lucide-react";
import toast from "react-hot-toast";

function PatientPanel({ patient, appt }) {
  return (
    <div className="space-y-4">
      {/* Patient header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-lg font-bold text-white">
          {(patient?.email || "P")[0].toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-fg">{patient?.email || "—"}</p>
          <p className="text-fg-subtle text-sm">NIC: {patient?.nic}</p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2">
        {[["Blood Group", patient?.blood_group || "—"], ["Mobile", patient?.mobile || "—"], ["Allergies", patient?.known_allergies || "None"]].map(([label, value]) => (
          <div key={label} className="p-3 rounded-xl bg-subtle border border-line">
            <p className="text-xs text-fg-subtle mb-0.5">{label}</p>
            <p className="text-sm font-medium text-fg">{value}</p>
          </div>
        ))}
      </div>

      {/* Reported symptoms */}
      {appt?.symptoms_text && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Reported Symptoms</p>
          <p className="text-sm text-fg-muted">{appt.symptoms_text}</p>
        </div>
      )}

      {/* Past diagnosis */}
      {appt?.has_diagnosis && (
        <div className="p-4 rounded-xl bg-primary-600/10 border border-primary-500/20">
          <p className="text-xs text-primary-700 dark:text-primary-400 mb-1 font-medium">Has existing diagnosis</p>
          <p className="text-xs text-fg-subtle">Diagnosis recorded for this appointment</p>
        </div>
      )}
    </div>
  );
}

function DiagnosisForm({ sessionId, apptId, onSaved }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ symptoms_observed: "", diagnosis: "", prescription: "", follow_up_notes: "", next_visit_date: "" });
  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const { mutate: save, isPending } = useMutation({
    mutationFn: (data) => sessionApi.saveDiagnosis(sessionId, apptId, { ...data, next_visit_date: data.next_visit_date || undefined }),
    onSuccess: () => { toast.success("Diagnosis saved!"); qc.invalidateQueries(["session-patients", sessionId]); onSaved(); },
    onError: () => toast.error("Failed to save diagnosis"),
  });

  return (
    <form onSubmit={e => { e.preventDefault(); save(form); }} className="space-y-4">
      <div>
        <label className="input-label">Symptoms Observed</label>
        <textarea name="symptoms_observed" value={form.symptoms_observed} onChange={handle} className="input-field" rows={2} placeholder="Clinical observations..." />
      </div>
      <div>
        <label className="input-label">Diagnosis</label>
        <textarea name="diagnosis" value={form.diagnosis} onChange={handle} className="input-field" rows={3} placeholder="Diagnosis details..." />
      </div>
      <div>
        <label className="input-label">Prescription</label>
        <textarea name="prescription" value={form.prescription} onChange={handle} className="input-field" rows={3} placeholder="Medications, dosage, instructions..." />
      </div>
      <div>
        <label className="input-label">Follow-up Notes</label>
        <textarea name="follow_up_notes" value={form.follow_up_notes} onChange={handle} className="input-field" rows={2} />
      </div>
      <div>
        <label className="input-label">Recommended Next Visit Date <span className="text-fg-subtle font-normal">(optional)</span></label>
        <input type="date" name="next_visit_date" value={form.next_visit_date} onChange={handle} className="input-field" />
      </div>
      <button type="submit" disabled={isPending} className="btn-primary w-full justify-center py-3">
        <Save size={16} />{isPending ? "Saving..." : "Save Diagnosis"}
      </button>
    </form>
  );
}

export default function CurrentSession() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [diagnosedSet, setDiagnosedSet] = useState(new Set());

  const { data: patients = [], isLoading, refetch } = useQuery({
    queryKey: ["session-patients", sessionId],
    queryFn: () => sessionApi.patients(sessionId).then(r => r.data),
  });

  const { mutate: endSession } = useMutation({
    mutationFn: () => sessionApi.end(sessionId),
    onSuccess: () => { toast.success("Session ended"); navigate("/doctor"); },
  });

  const selected = selectedIndex !== null ? patients[selectedIndex] : null;

  const handleSaved = () => {
    setDiagnosedSet(p => new Set([...p, selected?.appointment_id]));
    refetch();
  };

  const goNext = () => {
    if (selectedIndex < patients.length - 1) setSelectedIndex(selectedIndex + 1);
    else toast("Last patient in queue", { icon: "✅" });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/doctor")} className="text-fg-muted hover:text-fg"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-2xl font-bold text-fg">Current Session</h1>
            <p className="text-fg-subtle text-sm">{patients.length} patients in queue</p>
          </div>
        </div>
        <button onClick={() => endSession()} className="btn-danger">
          <StopCircle size={16} />End Session
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Patient Queue */}
        <div className="w-72 flex-shrink-0 glass-card overflow-y-auto">
          <div className="p-4 border-b border-line">
            <p className="text-xs font-semibold text-fg-subtle uppercase tracking-wider">Patient Queue</p>
          </div>
          {isLoading ? <div className="p-4 text-fg-subtle text-sm">Loading...</div> : (
            <div className="divide-y divide-line">
              {patients.map((p, i) => (
                <button key={p.appointment_id} onClick={() => setSelectedIndex(i)}
                  className={`w-full flex items-center gap-3 p-4 text-left transition-colors ${selectedIndex === i ? "bg-primary-600/20 border-l-2 border-primary-500" : "hover:bg-subtle"}`}>
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {p.slot_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg truncate">{p.patient?.email?.split("@")[0] || "Patient"}</p>
                    <p className="text-xs text-fg-subtle">NIC: {p.patient?.nic?.slice(0, 8) || "—"}...</p>
                  </div>
                  {(diagnosedSet.has(p.appointment_id) || p.has_diagnosis) && (
                    <CheckCircle size={14} className="text-accent-400 flex-shrink-0" />
                  )}
                </button>
              ))}
              {patients.length === 0 && <p className="p-4 text-fg-subtle text-sm">No patients in queue</p>}
            </div>
          )}
        </div>

        {/* Patient Info Panel */}
        {selected ? (
          <div className="flex-1 flex gap-4 min-w-0">
            {/* Left: Patient profile */}
            <div className="flex-1 glass-card p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-fg">Patient Profile</h3>
                <button onClick={() => setSelectedIndex(null)} className="text-fg-subtle hover:text-fg"><X size={16} /></button>
              </div>
              <PatientPanel patient={selected.patient} appt={selected} />
            </div>

            {/* Right: Diagnosis form */}
            <div className="w-80 flex-shrink-0 glass-card p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-fg">Diagnosis Entry</h3>
                <span className="badge badge-info">Slot #{selected.slot_number}</span>
              </div>
              <DiagnosisForm sessionId={sessionId} apptId={selected.appointment_id} onSaved={handleSaved} />
              <div className="flex gap-2 mt-4">
                <button onClick={() => setSelectedIndex(null)} className="btn-secondary flex-1 justify-center text-xs">
                  ← Queue
                </button>
                <button onClick={goNext} className="btn-secondary flex-1 justify-center text-xs">
                  Next <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 glass-card flex items-center justify-center text-fg-subtle flex-col gap-3">
            <User size={40} className="opacity-20" />
            <p className="text-sm">Select a patient from the queue to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}
