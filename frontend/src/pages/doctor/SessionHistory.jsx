import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { sessionApi } from "../../api";
import { ChevronDown, ChevronRight, Calendar, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

export default function SessionHistory() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("upcoming");
  const [expanded, setExpanded] = useState({});

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["sessions", tab],
    queryFn: () => sessionApi.mySessions(tab === "upcoming").then(r => r.data),
  });

  const { data: patientsMap = {} } = useQuery({
    queryKey: ["session-patients-map", sessions.map(s => s.id).join(",")],
    queryFn: async () => {
      const map = {};
      for (const s of sessions.filter(s => expanded[s.id])) {
        const res = await sessionApi.patients(s.id);
        map[s.id] = res.data;
      }
      return map;
    },
    enabled: sessions.some(s => expanded[s.id]),
  });

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-fg mb-1">Session History</h1>
        <p className="text-fg-subtle text-sm">View upcoming and past sessions</p>
      </div>

      <div className="flex gap-1 bg-subtle p-1 rounded-xl w-fit border border-line">
        {["upcoming", "past"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? "bg-primary-600 text-white" : "text-fg-subtle hover:text-fg"}`}>
            {t === "upcoming" ? "📅 Upcoming" : "📁 Past"}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="glass-card h-20 animate-pulse" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="glass-card p-16 text-center text-fg-subtle">
          <Clock size={32} className="mx-auto mb-2 opacity-30" />
          <p>No {tab} sessions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => (
            <div key={s.id} className="glass-card overflow-hidden">
              <button onClick={() => toggleExpand(s.id)} className="w-full flex items-center gap-4 p-5 hover:bg-subtle text-left">
                <div className="p-2.5 rounded-xl bg-primary-600/20"><Calendar size={18} className="text-primary-400" /></div>
                <div className="flex-1">
                  <p className="font-semibold text-fg">{s.date ? format(new Date(s.date), "EEEE, MMMM d, yyyy") : "—"}</p>
                  <p className="text-fg-subtle text-sm flex items-center gap-2 mt-0.5">
                    <Clock size={12} />{s.start_time} — {s.end_time}
                    <span className="mx-1">·</span>
                    <Users size={12} />{s.booked_count ?? 0} patients
                  </p>
                </div>
                <span className={`badge ${s.status === "completed" ? "badge-neutral" : s.status === "active" ? "badge-success" : "badge-info"}`}>{s.status}</span>
                {tab === "upcoming" && s.status === "scheduled" && (
                  <button onClick={(e) => { e.stopPropagation(); navigate(`/doctor/session/${s.id}`); }} className="btn-primary text-xs px-3 py-1.5">Start →</button>
                )}
                {expanded[s.id] ? <ChevronDown size={16} className="text-fg-dim" /> : <ChevronRight size={16} className="text-fg-dim" />}
              </button>

              {expanded[s.id] && (
                <div className="border-t border-line p-4">
                  {!patientsMap[s.id] ? (
                    <p className="text-fg-subtle text-sm">Loading patients...</p>
                  ) : patientsMap[s.id]?.length === 0 ? (
                    <p className="text-fg-subtle text-sm">No patients booked</p>
                  ) : (
                    <div className="space-y-2">
                      {patientsMap[s.id].map(p => (
                        <div key={p.appointment_id} className="flex items-center justify-between p-3 rounded-xl bg-subtle border border-line">
                          <div>
                            <p className="text-sm font-medium text-fg">Slot #{p.slot_number} · {p.patient?.email || "—"}</p>
                            <p className="text-xs text-fg-subtle">NIC: {p.patient?.nic}</p>
                          </div>
                          <span className={`badge ${p.status === "completed" ? "badge-success" : "badge-info"}`}>{p.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
