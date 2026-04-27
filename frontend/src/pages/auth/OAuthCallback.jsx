import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function OAuthCallback() {
  const [params] = useSearchParams();
  const { loginWithTokens, loadUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const access = params.get("access_token");
    const refresh = params.get("refresh_token");
    const profileComplete = params.get("profile_complete") === "true";
    const role = params.get("role");

    if (!access) { navigate("/login"); return; }

    localStorage.setItem("access_token", access);
    if (refresh) localStorage.setItem("refresh_token", refresh);

    loadUser().then(() => {
      if (!profileComplete) {
        navigate("/complete-profile", { state: { role } });
      } else {
        navigate(role === "doctor" ? "/doctor" : role === "admin" ? "/admin" : "/patient");
      }
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-app">
      <div className="text-center">
        <div className="animate-spin w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-fg-subtle text-sm">Completing sign-in...</p>
      </div>
    </div>
  );
}
