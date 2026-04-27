import { useState } from "react";
import { Activity, Shield, Users, Calendar } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Navigate } from "react-router-dom";
import ThemeToggle from "../../components/ThemeToggle";

const GOOGLE_AUTH_URL = (role) =>
  `${import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1"}/auth/google?role=${role}`;

function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <div className="glass-card p-5 flex gap-4 items-start hover:border-primary-500/30 transition-all duration-300">
      <div className="p-2.5 rounded-xl bg-primary-600/20 text-primary-600 dark:text-primary-400">
        <Icon size={20} />
      </div>
      <div>
        <p className="font-semibold text-fg text-sm">{title}</p>
        <p className="text-fg-subtle text-xs mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("patient");

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Theme toggle — top-right corner */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left — Brand */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2.5 rounded-xl bg-primary-600/30 border border-primary-500/30">
              <Activity className="text-primary-600 dark:text-primary-400" size={28} />
            </div>
            <span className="font-bold text-2xl tracking-tight text-gradient">HMS</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-4 text-fg">
            Modern Healthcare,<br />
            <span className="text-gradient">Simplified.</span>
          </h1>
          <p className="text-fg-muted text-lg mb-8 leading-relaxed">
            Streamline appointments, manage medical records, and connect patients with doctors — all in one secure platform.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FeatureCard icon={Calendar} title="Smart Booking" desc="Book appointments and get instant slot confirmations" />
            <FeatureCard icon={Shield} title="Secure & Private" desc="Role-based access with encrypted medical records" />
            <FeatureCard icon={Users} title="Multi-Role" desc="Separate portals for patients, doctors and admins" />
            <FeatureCard icon={Activity} title="AI Summaries" desc="AI-powered appointment summaries coming soon" />
          </div>
        </div>

        {/* Right — Auth card */}
        <div className="glass-card p-8 shadow-glass">
          <h2 className="text-xl font-bold text-fg mb-1">Get Started</h2>
          <p className="text-fg-subtle text-sm mb-6">Sign in with your Google account to continue</p>

          {/* Role tabs */}
          <div className="flex rounded-xl bg-subtle p-1 mb-6">
            {["patient", "doctor"].map((r) => (
              <button
                key={r}
                onClick={() => setActiveTab(r)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                  activeTab === r
                    ? "bg-primary-600 text-white shadow-glow"
                    : "text-fg-subtle hover:text-fg"
                }`}
              >
                {r === "patient" ? "🧑‍⚕️ Patient" : "👨‍⚕️ Doctor"}
              </button>
            ))}
          </div>

          <a
            href={GOOGLE_AUTH_URL(activeTab)}
            className="flex items-center justify-center gap-3 w-full py-3.5 rounded-xl border border-line bg-subtle hover:bg-line transition-all duration-200 text-fg font-medium text-sm group"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google as {activeTab === "patient" ? "Patient" : "Doctor"}
          </a>

          <p className="text-center text-fg-subtle text-xs mt-5">
            By signing in you agree to our{" "}
            <span className="text-primary-600 dark:text-primary-400 cursor-pointer hover:underline">Terms of Service</span>
            {" "}and{" "}
            <span className="text-primary-600 dark:text-primary-400 cursor-pointer hover:underline">Privacy Policy</span>
          </p>

          <div className="border-t border-line mt-5 pt-4 text-center">
            <span className="text-fg-subtle text-xs">Healthcare admin? </span>
            <a href="/admin-login" className="text-primary-600 dark:text-primary-400 text-xs hover:underline">Admin login →</a>
          </div>
        </div>
      </div>
    </div>
  );
}
