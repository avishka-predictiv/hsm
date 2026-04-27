import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { sessionApi } from "../../api";
import { PlayCircle, Users, Clock, Calendar } from "lucide-react";
import { format } from "date-fns";

function SessionCard({ session, onStart }) {
  return (
    <div className="glass-card p-5 space-y-3 hover:border-primary-500/30 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-600/20"><Calendar size={18} className="text-primary-400" /></div>
          <div>
            <p className="font-semibold text-fg">Session</p>
            <p className="text-fg-subtle text-xs flex items-center gap-1">
              <Clock size={11} />{session.start_time} — {session.end_time}
            </p>
          </div>
        </div>
        <span className={`badge ${session.status === "active" ? "badge-success" : "badge-info"}`}>{session.status}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1.5 text-fg-muted">
          <Users size={14} />{session.booked_count ?? 0}/{session.max_patients} patients
        </div>
        {session.status === "scheduled" && (
          <button onClick={() => onStart(session.id)} className="btn-primary text-xs px-3 py-1.5">
            <PlayCircle size={14} /> Start Session
          </button>
        )}
        {session.status === "active" && (
          <button onClick={() => onStart(session.id)} className="btn-primary text-xs px-3 py-1.5 bg-accent-500 hover:bg-accent-600">
            ▶ Resume Session
          </button>
        )}
      </div>
    </div>
  );
}

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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-fg mb-1">Today's Sessions</h1>
        <p className="text-fg-subtle text-sm">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-bold text-fg">{sessions.length}</p>
          <p className="text-fg-subtle text-sm">Sessions Today</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-bold text-fg">{sessions.reduce((a, s) => a + (s.booked_count || 0), 0)}</p>
          <p className="text-fg-subtle text-sm">Total Patients</p>
        </div>
        <div className="glass-card p-5 text-center">
          <p className="text-3xl font-bold text-accent-400">{sessions.filter(s => s.status === "active").length}</p>
          <p className="text-fg-subtle text-sm">Active Now</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="glass-card h-32 animate-pulse" />)}</div>
      ) : sessions.length === 0 ? (
        <div className="glass-card p-16 text-center text-fg-subtle">
          <Calendar size={32} className="mx-auto mb-2 opacity-30" />
          <p>No sessions scheduled for today</p>
          <button onClick={() => navigate("/doctor/sessions")} className="btn-secondary mt-4 mx-auto">
            View All Sessions
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-fg">Sessions</h2>
          {sessions.map(s => <SessionCard key={s.id} session={s} onStart={handleStart} />)}
        </div>
      )}
    </div>
  );
}
