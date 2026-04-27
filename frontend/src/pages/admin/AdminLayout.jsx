import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ThemeToggle from "../../components/ThemeToggle";
import Ico from "../../components/Ico";
import Avatar from "../../components/Avatar";

const NAV = [
  { to: "/admin", icon: "barChart2", label: "Dashboard", end: true },
  { to: "/admin/users", icon: "users", label: "Users" },
  { to: "/admin/doctor-verification", icon: "userCheck", label: "Doctor Verification" },
  { to: "/admin/appointments", icon: "calendar", label: "Appointments" },
  { to: "/admin/payments", icon: "creditCard", label: "Payments" },
  { to: "/admin/specializations", icon: "activity", label: "Specializations" },
  { to: "/admin/settings", icon: "settings", label: "Settings" },
  { to: "/admin/audit-logs", icon: "shield", label: "Audit Logs" },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div style={{ padding: "18px 16px 14px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                flexShrink: 0,
                background: "linear-gradient(135deg, var(--amber), #92400e)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(217,119,6,0.25)",
              }}
            >
              <Ico n="shield" size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: "var(--ink)", letterSpacing: "-.02em", lineHeight: 1 }}>HMS</div>
              <div style={{ fontSize: 10.5, color: "var(--ink-mute)", marginTop: 2, fontWeight: 500 }}>Admin Portal</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 1 }}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}>
              <Ico n={item.icon} size={17} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: "10px 8px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 10px", borderRadius: 9, marginBottom: 6, background: "var(--muted)" }}>
            <Avatar email={user?.email || ""} size={30} radius={7} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {(user?.email || "admin").split("@")[0]}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--ink-mute)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.email || ""}
              </div>
            </div>
          </div>
          <button className="nav-item nav-item-danger" type="button" onClick={() => { logout(); navigate("/admin-login"); }}>
            <Ico n="logOut" size={16} /> Sign Out
          </button>
        </div>
      </aside>

      <div className="main-area">
        <div className="topbar">
          <div style={{ fontSize: 13, color: "var(--ink-mute)", fontWeight: 500 }}>Admin Console</div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ThemeToggle />
            <div style={{ width: 1, height: 18, background: "var(--border)", margin: "0 4px" }} />
            <Avatar email={user?.email || ""} size={30} radius={8} />
          </div>
        </div>
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
