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
import FindDoctors from "./pages/patient/FindDoctors";
import DoctorDetail from "./pages/patient/DoctorDetail";
import BookAppointment from "./pages/patient/BookAppointment";
import MyAppointments from "./pages/patient/MyAppointments";
import MedicalHistory from "./pages/patient/MedicalHistory";
import Payments from "./pages/patient/Payments";
import PaymentMethods from "./pages/patient/PaymentMethods";
import NotificationSettings from "./pages/patient/NotificationSettings";

// Doctor
import DoctorLayout from "./pages/doctor/DoctorLayout";
import DoctorHome from "./pages/doctor/DoctorHome";
import DoctorProfilePage from "./pages/doctor/DoctorProfilePage";
import DoctorSchedulePage from "./pages/doctor/DoctorSchedulePage";
import TodaySessions from "./pages/doctor/TodaySessions";
import CurrentSession from "./pages/doctor/CurrentSession";
import SessionHistory from "./pages/doctor/SessionHistory";

// Admin
import AdminLayout from "./pages/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDoctorVerification from "./pages/admin/AdminDoctorVerification";
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
              <Route path="doctors" element={<FindDoctors />} />
              <Route path="doctors/:id" element={<DoctorDetail />} />
              <Route path="book/:sessionId" element={<BookAppointment />} />
              <Route path="appointments" element={<MyAppointments />} />
              <Route path="history" element={<MedicalHistory />} />
              <Route path="payments" element={<Payments />} />
              <Route path="payment-methods" element={<PaymentMethods />} />
              <Route path="notifications" element={<NotificationSettings />} />
            </Route>

            {/* Doctor */}
            <Route path="/doctor" element={<ProtectedRoute allowedRoles={["doctor"]}><DoctorLayout /></ProtectedRoute>}>
              <Route index element={<DoctorHome />} />
              <Route path="appointments" element={<SessionHistory />} />
              <Route path="schedule" element={<DoctorSchedulePage />} />
              <Route path="profile" element={<DoctorProfilePage />} />
              <Route path="today" element={<TodaySessions />} />
              <Route path="session/:id" element={<CurrentSession />} />
            </Route>

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="doctor-verification" element={<AdminDoctorVerification />} />
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
