import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";

// Auth
import Landing from "./pages/auth/Landing";
import OAuthCallback from "./pages/auth/OAuthCallback";
import CompleteProfile from "./pages/auth/CompleteProfile";
import AdminLogin from "./pages/auth/AdminLogin";

// Patient
import PatientLayout from "./pages/patient/PatientLayout";
import PatientHome from "./pages/patient/PatientHome";
import PatientProfile from "./pages/patient/PatientProfile";
import DoctorList from "./pages/patient/DoctorList";
import DoctorProfile from "./pages/patient/DoctorProfile";
import MedicalHistory from "./pages/patient/MedicalHistory";

// Doctor
import DoctorLayout from "./pages/doctor/DoctorLayout";
import DoctorHome from "./pages/doctor/DoctorHome";
import DoctorProfilePage from "./pages/doctor/DoctorProfilePage";
import PatientViewer from "./pages/doctor/PatientViewer";
import SessionHistory from "./pages/doctor/SessionHistory";
import CurrentSession from "./pages/doctor/CurrentSession";

// Admin
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAppointments from "./pages/admin/AdminAppointments";
import AdminPayments from "./pages/admin/AdminPayments";
import AdminSpecializations from "./pages/admin/AdminSpecializations";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30000 } } });

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />;
  if (!user.profile_complete && user.role !== "admin") return <Navigate to="/complete-profile" replace />;
  return children;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "patient") return <Navigate to="/patient" replace />;
  if (user.role === "doctor") return <Navigate to="/doctor" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  return <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: "rgb(var(--color-panel))",
                  color: "rgb(var(--color-fg))",
                  border: "1px solid rgb(var(--color-line))",
                },
              }}
            />
          <Routes>
            {/* Public */}
            <Route path="/login" element={<Landing />} />
            <Route path="/auth/callback" element={<OAuthCallback />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route path="/" element={<RoleRedirect />} />

            {/* Patient */}
            <Route path="/patient" element={<ProtectedRoute allowedRoles={["patient"]}><PatientLayout /></ProtectedRoute>}>
              <Route index element={<PatientHome />} />
              <Route path="profile" element={<PatientProfile />} />
              <Route path="appointments" element={<DoctorList />} />
              <Route path="appointments/doctor/:id" element={<DoctorProfile />} />
              <Route path="history" element={<MedicalHistory />} />
            </Route>

            {/* Doctor */}
            <Route path="/doctor" element={<ProtectedRoute allowedRoles={["doctor"]}><DoctorLayout /></ProtectedRoute>}>
              <Route index element={<DoctorHome />} />
              <Route path="profile" element={<DoctorProfilePage />} />
              <Route path="patients" element={<PatientViewer />} />
              <Route path="sessions" element={<SessionHistory />} />
              <Route path="session/:id" element={<CurrentSession />} />
            </Route>

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="appointments" element={<AdminAppointments />} />
              <Route path="payments" element={<AdminPayments />} />
              <Route path="specializations" element={<AdminSpecializations />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
            </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
