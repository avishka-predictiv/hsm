import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api";
import { Users, Calendar, CreditCard, TrendingUp, Activity, DollarSign } from "lucide-react";

function StatCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color}`}><Icon size={20} className="text-white" /></div>
        <TrendingUp size={16} className="text-fg-dim" />
      </div>
      <p className="text-3xl font-bold text-fg mb-1">{value ?? "—"}</p>
      <p className="text-fg-subtle text-sm">{label}</p>
      {sub && <p className="text-xs text-fg-dim mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { data: stats } = useQuery({ queryKey: ["admin-stats"], queryFn: () => adminApi.stats().then(r => r.data) });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-fg mb-1">Admin Dashboard</h1>
        <p className="text-fg-subtle text-sm">System overview and analytics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Patients" value={stats?.total_patients} icon={Users} color="bg-primary-600" />
        <StatCard label="Total Doctors" value={stats?.total_doctors} icon={Activity} color="bg-accent-500" />
        <StatCard label="Total Appointments" value={stats?.total_appointments} icon={Calendar} color="bg-amber-500" />
        <StatCard label="Total Revenue" value={stats?.total_revenue ? `LKR ${Number(stats.total_revenue).toFixed(2)}` : "LKR 0"} icon={DollarSign} color="bg-violet-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-bold text-fg mb-4">Quick Actions</h3>
          <div className="space-y-2">
            {[
              ["Verify pending doctors", "/admin/users"],
              ["View today's appointments", "/admin/appointments"],
              ["Review recent payments", "/admin/payments"],
              ["Manage specializations", "/admin/specializations"],
            ].map(([label, href]) => (
              <a key={href} href={href} className="flex items-center justify-between p-3 rounded-xl hover:bg-subtle text-fg-muted hover:text-fg transition-colors text-sm">
                {label} <span className="text-primary-600 dark:text-primary-400">→</span>
              </a>
            ))}
          </div>
        </div>
        <div className="glass-card p-6">
          <h3 className="font-bold text-fg mb-4">System Status</h3>
          <div className="space-y-3">
            {[["API Server", "Online"], ["Database", "Connected"], ["File Storage", "Local"], ["Email Service", "Configured"]].map(([service, status]) => (
              <div key={service} className="flex items-center justify-between">
                <span className="text-fg-muted text-sm">{service}</span>
                <span className="badge badge-success">{status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
