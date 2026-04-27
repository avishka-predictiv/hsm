import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Calendar, FileText, Clock, CheckCircle, TrendingUp, Bell } from "lucide-react";
import { appointmentApi } from "../../api";
import { useAuth } from "../../context/AuthContext";
import { format } from "date-fns";

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}><Icon size={20} className="text-white" /></div>
      <div>
        <p className="text-2xl font-bold text-fg">{value ?? "—"}</p>
        <p className="text-fg-subtle text-sm">{label}</p>
      </div>
    </div>
  );
}

function AppointmentCard({ appt }) {
  return (
    <div className="glass-card p-4 flex items-center gap-4 hover:border-primary-500/30 transition-all duration-200">
      <div className="p-2.5 rounded-xl bg-primary-600/20 text-primary-400"><Calendar size={18} /></div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-fg text-sm truncate">Appointment #{appt.slot_number}</p>
        <p className="text-fg-subtle text-xs">{appt.booked_at ? format(new Date(appt.booked_at), "MMM d, yyyy") : "—"}</p>
      </div>
      <span className={`badge ${appt.status === "confirmed" ? "badge-success" : "badge-info"}`}>{appt.status}</span>
    </div>
  );
}

export default function PatientHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: upcoming = [] } = useQuery({ queryKey: ["upcoming-appts"], queryFn: () => appointmentApi.upcoming().then(r => r.data) });
  const { data: history = [] } = useQuery({ queryKey: ["appt-history"], queryFn: () => appointmentApi.history().then(r => r.data) });

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-fg mb-1">Welcome back 👋</h1>
        <p className="text-fg-subtle">{user?.email}</p>
      </div>

      {/* Primary CTAs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={() => navigate("/patient/appointments")}
          className="glass-card p-6 flex flex-col items-start gap-3 hover:border-primary-500/40 hover:bg-primary-600/5 transition-all duration-300 group text-left">
          <div className="p-3 rounded-xl bg-primary-600/30 group-hover:bg-primary-600/50 transition-colors">
            <Calendar size={24} className="text-primary-400" />
          </div>
          <div>
            <p className="font-bold text-fg text-lg">Book an Appointment</p>
            <p className="text-fg-subtle text-sm">Find doctors and schedule your visit</p>
          </div>
          <span className="btn-primary text-xs px-3 py-1.5">Browse Doctors →</span>
        </button>

        <button onClick={() => navigate("/patient/history")}
          className="glass-card p-6 flex flex-col items-start gap-3 hover:border-accent-500/40 hover:bg-accent-500/5 transition-all duration-300 group text-left">
          <div className="p-3 rounded-xl bg-accent-500/20 group-hover:bg-accent-500/30 transition-colors">
            <FileText size={24} className="text-accent-400" />
          </div>
          <div>
            <p className="font-bold text-fg text-lg">Medical History</p>
            <p className="text-fg-subtle text-sm">View past appointments and diagnoses</p>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent-500/20 text-accent-400 font-semibold">View Records →</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Visits" value={history.length} icon={CheckCircle} color="bg-accent-500" />
        <StatCard label="Upcoming" value={upcoming.length} icon={Clock} color="bg-primary-600" />
        <StatCard label="This Year" value={history.filter(a => new Date(a.booked_at).getFullYear() === new Date().getFullYear()).length} icon={TrendingUp} color="bg-amber-500" />
        <StatCard label="Notifications" value={0} icon={Bell} color="bg-violet-600" />
      </div>

      {/* Upcoming appointments */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-fg">Upcoming Appointments</h2>
          <button onClick={() => navigate("/patient/appointments")} className="text-primary-600 dark:text-primary-400 text-sm hover:underline">Book new →</button>
        </div>
        {upcoming.length === 0 ? (
          <div className="glass-card p-10 text-center text-fg-subtle">
            <Calendar size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No upcoming appointments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(a => <AppointmentCard key={a.id} appt={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}
