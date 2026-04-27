import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authApi } from "../../api";
import { Activity, Shield, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import ThemeToggle from "../../components/ThemeToggle";

export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { loadUser } = useAuth();
  const navigate = useNavigate();

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.adminLogin(form.email, form.password);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      await loadUser();
      toast.success("Welcome, Admin!");
      navigate("/admin");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-6 relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="p-2.5 rounded-xl bg-primary-600/30 border border-primary-500/30">
            <Activity className="text-primary-600 dark:text-primary-400" size={24} />
          </div>
          <span className="font-bold text-2xl text-gradient">HMS Admin</span>
        </div>
        <div className="glass-card p-8">
          <div className="flex items-center gap-2 mb-6">
            <Shield size={18} className="text-primary-600 dark:text-primary-400" />
            <h1 className="text-lg font-bold text-fg">Admin Portal</h1>
          </div>
          <p className="text-fg-subtle text-sm mb-6">This portal is restricted to authorized administrators only.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="input-label">Email Address</label>
              <input name="email" type="email" required value={form.email} onChange={handle} className="input-field" placeholder="admin@hms.com" />
            </div>
            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <input name="password" type={showPw ? "text" : "password"} required value={form.password} onChange={handle} className="input-field pr-10" placeholder="••••••••" />
                <button type="button" onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 mt-2">
              {loading ? "Signing in..." : "Sign in to Admin Panel"}
            </button>
          </form>
          <p className="text-center text-fg-subtle text-xs mt-5">
            <a href="/login" className="text-primary-600 dark:text-primary-400 hover:underline">← Back to patient/doctor login</a>
          </p>
        </div>
      </div>
    </div>
  );
}
