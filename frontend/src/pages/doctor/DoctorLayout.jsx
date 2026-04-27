import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Home, User, Users, Clock, Stethoscope, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../../components/ThemeToggle";

const NAV = [
  { to: "/doctor", icon: Home, label: "Home", end: true },
  { to: "/doctor/profile", icon: User, label: "Profile" },
  { to: "/doctor/patients", icon: Users, label: "My Patients" },
  { to: "/doctor/sessions", icon: Clock, label: "Session History" },
];

export default function DoctorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-app">
      <aside className="w-64 flex-shrink-0 bg-panel border-r border-line flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-line">
          <div className="p-2 rounded-xl bg-accent-500/20 border border-accent-500/30">
            <Stethoscope className="text-accent-600 dark:text-accent-400" size={20} />
          </div>
          <div>
            <span className="font-bold text-lg text-gradient">HMS</span>
            <p className="text-xs text-fg-subtle">Doctor Portal</p>
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
          <div className="px-4 py-2 mb-2">
            <p className="text-xs text-fg-subtle truncate">{user?.email}</p>
          </div>
          <button onClick={() => { logout(); navigate("/login"); }}
            className="nav-item w-full text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 hover:bg-red-500/10">
            <LogOut size={18} />Logout
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 flex items-center justify-between px-8 border-b border-line bg-panel/70 backdrop-blur-sm sticky top-0 z-10">
          <h2 className="text-sm font-medium text-fg-muted">Hospital Management System</h2>
          <ThemeToggle />
        </header>
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
