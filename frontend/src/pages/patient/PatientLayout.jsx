import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Activity, Calendar, FileText, User, LogOut, Bell } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../../components/ThemeToggle";

const NAV = [
  { to: "/patient", icon: Activity, label: "Home", end: true },
  { to: "/patient/appointments", icon: Calendar, label: "Appointments" },
  { to: "/patient/history", icon: FileText, label: "Medical History" },
  { to: "/patient/profile", icon: User, label: "Profile" },
];

export default function PatientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-app">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-panel border-r border-line flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-line">
          <div className="p-2 rounded-xl bg-primary-600/20 border border-primary-500/30">
            <Activity className="text-primary-500 dark:text-primary-400" size={20} />
          </div>
          <span className="font-bold text-lg text-gradient">HMS</span>
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
          <button onClick={() => { logout(); navigate("/login"); }}
            className="nav-item w-full text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-500/10">
            <LogOut size={18} />Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 flex items-center justify-between px-8 border-b border-line bg-panel/70 backdrop-blur-sm sticky top-0 z-10">
          <div />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="btn-ghost relative" aria-label="Notifications">
              <Bell size={18} />
            </button>
            <NavLink to="/patient/profile">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-bold text-white cursor-pointer hover:opacity-90 transition-opacity">
                {user?.email?.[0]?.toUpperCase() || "P"}
              </div>
            </NavLink>
          </div>
        </header>
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
