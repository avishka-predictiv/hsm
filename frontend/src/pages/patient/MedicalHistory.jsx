import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { appointmentApi } from "../../api";
import { FileText, Calendar, User, ChevronDown, ChevronRight, Sparkles, X } from "lucide-react";
import { format } from "date-fns";

function DiagnosisModal({ appt, onClose }) {
  const d = appt.diagnosis;
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-fg">Appointment Details</h3>
          <button onClick={onClose} className="text-fg-subtle hover:text-fg"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="p-3 rounded-xl bg-subtle border border-line"><p className="text-fg-subtle">Date</p><p className="text-fg font-medium mt-0.5">{appt.session?.date ? format(new Date(appt.session.date), "MMMM d, yyyy") : appt.booked_at ? format(new Date(appt.booked_at), "MMMM d, yyyy") : "—"}</p></div>
          <div className="p-3 rounded-xl bg-subtle border border-line"><p className="text-fg-subtle">Slot</p><p className="text-fg font-medium mt-0.5">#{appt.slot_number}</p></div>
          <div className="p-3 rounded-xl bg-subtle border border-line"><p className="text-fg-subtle">Status</p><p className="text-fg font-medium mt-0.5 capitalize">{appt.status}</p></div>
        </div>
        {appt.symptoms_text && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">Reported Symptoms</p>
            <p className="text-fg-muted text-sm">{appt.symptoms_text}</p>
          </div>
        )}
        {d ? (
          <div className="space-y-3">
            {d.symptoms_observed && <div className="p-4 rounded-xl bg-subtle border border-line"><p className="text-xs text-fg-subtle mb-1">Symptoms Observed</p><p className="text-fg text-sm">{d.symptoms_observed}</p></div>}
            {d.diagnosis && <div className="p-4 rounded-xl bg-subtle border border-line"><p className="text-xs text-fg-subtle mb-1">Diagnosis</p><p className="text-fg text-sm">{d.diagnosis}</p></div>}
            {d.prescription && <div className="p-4 rounded-xl bg-subtle border border-line"><p className="text-xs text-fg-subtle mb-1">Prescription</p><p className="text-fg text-sm">{d.prescription}</p></div>}
            {d.follow_up_notes && <div className="p-4 rounded-xl bg-subtle border border-line"><p className="text-xs text-fg-subtle mb-1">Follow-up Notes</p><p className="text-fg text-sm">{d.follow_up_notes}</p></div>}
            {d.next_visit_date && (
              <div className="p-4 rounded-xl bg-primary-600/10 border border-primary-500/20">
                <p className="text-xs text-primary-700 dark:text-primary-400 mb-1">📅 Recommended Next Visit</p>
                <p className="text-fg font-semibold">{format(new Date(d.next_visit_date), "MMMM d, yyyy")}</p>
              </div>
            )}
            {/* AI Summary placeholder */}
            <div className="p-4 rounded-xl bg-violet-600/10 border border-violet-500/20">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={14} className="text-violet-400" />
                <p className="text-xs font-medium text-violet-400">AI Summary</p>
              </div>
              {d.ai_summary
                ? <p className="text-fg-muted text-sm">{d.ai_summary}</p>
                : <p className="text-fg-subtle text-sm italic">AI-generated summary coming soon...</p>}
            </div>
          </div>
        ) : (
          <p className="text-fg-subtle text-sm italic">No diagnosis recorded for this appointment</p>
        )}
      </div>
    </div>
  );
}

export default function MedicalHistory() {
  const [groupByDoctor, setGroupByDoctor] = useState(false);
  const [selected, setSelected] = useState(null);
  const [expandedDoctors, setExpandedDoctors] = useState({});

  const { data: history = [], isLoading } = useQuery({
    queryKey: ["appt-history"],
    queryFn: () => appointmentApi.history().then(r => r.data),
  });

  const grouped = {};
  if (groupByDoctor) {
    history.forEach(a => {
      const key = a.doctor_id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(a);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fg mb-1">Medical History</h1>
          <p className="text-fg-subtle text-sm">{history.length} past appointment{history.length !== 1 ? "s" : ""}</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-fg-muted">Group by doctor</span>
          <div onClick={() => setGroupByDoctor(p => !p)}
            className={`w-11 h-6 rounded-full relative transition-colors border border-line ${groupByDoctor ? "bg-primary-600" : "bg-subtle"}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${groupByDoctor ? "translate-x-5" : "translate-x-0.5"}`} />
          </div>
        </label>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="glass-card h-20 animate-pulse" />)}</div>
      ) : history.length === 0 ? (
        <div className="glass-card p-16 text-center text-fg-subtle">
          <FileText size={32} className="mx-auto mb-2 opacity-30" />
          <p>No medical history yet</p>
        </div>
      ) : groupByDoctor ? (
        <div className="space-y-4">
          {Object.entries(grouped).map(([doctorId, appts]) => (
            <div key={doctorId} className="glass-card overflow-hidden">
              <button onClick={() => setExpandedDoctors(p => ({ ...p, [doctorId]: !p[doctorId] }))}
                className="w-full flex items-center justify-between p-4 hover:bg-subtle">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-bold text-white">
                    Dr
                  </div>
                  <div>
                    <p className="font-semibold text-fg text-sm">Doctor ID: {doctorId.slice(0, 8)}...</p>
                    <p className="text-fg-subtle text-xs">{appts.length} visits</p>
                  </div>
                </div>
                {expandedDoctors[doctorId] ? <ChevronDown size={16} className="text-fg-dim" /> : <ChevronRight size={16} className="text-fg-dim" />}
              </button>
              {expandedDoctors[doctorId] && (
                <div className="border-t border-line divide-y divide-line">
                  {appts.map(a => <AppointmentRow key={a.id} appt={a} onClick={() => setSelected(a)} />)}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card divide-y divide-line overflow-hidden">
          {history.map(a => <AppointmentRow key={a.id} appt={a} onClick={() => setSelected(a)} />)}
        </div>
      )}

      {selected && <DiagnosisModal appt={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AppointmentRow({ appt, onClick }) {
  const displayDate = appt.session?.date || appt.booked_at;
  return (
    <button onClick={onClick} className="w-full flex items-center gap-4 p-4 hover:bg-subtle text-left transition-colors">
      <div className="p-2.5 rounded-xl bg-primary-600/20 text-primary-400 flex-shrink-0"><FileText size={16} /></div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-fg text-sm">Appointment #{appt.slot_number}</p>
        <p className="text-fg-subtle text-xs">{displayDate ? format(new Date(displayDate), "MMM d, yyyy") : "—"}</p>
      </div>
      <span className={`badge ${appt.status === "completed" ? "badge-success" : "badge-neutral"}`}>{appt.status}</span>
      {appt.diagnosis?.ai_summary && <Sparkles size={14} className="text-violet-400 flex-shrink-0" />}
      <ChevronRight size={16} className="text-fg-dim flex-shrink-0" />
    </button>
  );
}
