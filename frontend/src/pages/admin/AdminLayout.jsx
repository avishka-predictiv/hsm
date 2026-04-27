import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, CreditCard, List, Settings, FileText, LogOut, Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../../components/ThemeToggle";

const NAV = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/admin/users", icon: Users, label: "User Management" },
  { to: "/admin/appointments", icon: Calendar, label: "Appointments" },
  { to: "/admin/payments", icon: CreditCard, label: "Payments" },
  { to: "/admin/specializations", icon: List, label: "Specializations" },
  { to: "/admin/settings", icon: Settings, label: "System Settings" },
  { to: "/admin/audit-logs", icon: FileText, label: "Audit Logs" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-app">
      <aside className="w-64 flex-shrink-0 bg-panel border-r border-line flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-line">
          <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/30">
            <Shield className="text-red-500 dark:text-red-400" size={20} />
          </div>
          <div>
            <span className="font-bold text-lg text-fg">HMS</span>
            <p className="text-xs text-red-500 dark:text-red-400">Admin Portal</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
              <Icon size={18} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-line">
          <p className="text-xs text-fg-subtle px-4 mb-2 truncate">{user?.email}</p>
          <button onClick={() => { logout(); navigate("/admin-login"); }}
            className="nav-item w-full text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-500/10">
            <LogOut size={18} />Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 flex items-center justify-between px-8 border-b border-line bg-panel/70 backdrop-blur-sm sticky top-0 z-10">
          <span className="text-sm text-fg-muted">Hospital Management System — Admin</span>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
