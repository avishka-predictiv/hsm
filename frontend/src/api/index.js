import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

const api = axios.create({ baseURL: BASE_URL });

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refresh });
          localStorage.setItem("access_token", data.access_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// Namespaced API helpers
export const authApi = {
  me: () => api.get("/auth/me"),
  adminLogin: (email, password) => api.post("/auth/admin/login", { email, password }),
  register: (data) => api.post("/auth/register", data),
  login: (data) => api.post("/auth/login", data),
  completePatientProfile: (data) => api.post("/auth/complete-profile/patient", data),
  completeDoctorProfile: (data) => api.post("/auth/complete-profile/doctor", data),
  refresh: (token) => api.post("/auth/refresh", { refresh_token: token }),
};

export const doctorApi = {
  list: (params) => api.get("/doctors", { params }),
  get: (id) => api.get(`/doctors/${id}`),
  availability: (id) => api.get(`/doctors/${id}/availability`),
  myProfile: () => api.get("/doctors/profile/me"),
  updateProfile: (data) => api.put("/doctors/profile/me", data),
  mySchedules: () => api.get("/doctors/schedules/me"),
  createSchedule: (data) => api.post("/doctors/schedules/me", data),
  updateSchedule: (id, data) => api.put(`/doctors/schedules/me/${id}`, data),
  deleteSchedule: (id) => api.delete(`/doctors/schedules/me/${id}`),
};

export const patientApi = {
  myProfile: () => api.get("/patients/profile/me"),
  updateProfile: (data) => api.put("/patients/profile/me", data),
  notificationPrefs: () => api.get("/patients/notification-preferences"),
  updateNotificationPrefs: (data) => api.put("/patients/notification-preferences", data),
};

export const appointmentApi = {
  book: (data) => api.post("/appointments", data),
  cancel: (id, data) => api.delete(`/appointments/${id}`, { data }),
  upcoming: () => api.get("/appointments/upcoming"),
  history: () => api.get("/appointments/history"),
  slots: (sessionId) => api.get(`/appointments/slots/${sessionId}`),
  uploadAttachment: (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post(`/appointments/${id}/attachments`, fd, { headers: { "Content-Type": "multipart/form-data" } });
  },
};

export const sessionApi = {
  today: () => api.get("/sessions/today"),
  info: (id) => api.get(`/sessions/${id}/info`),
  mySessions: (upcoming = true) => api.get("/sessions/my", { params: { upcoming } }),
  create: (data) => api.post("/sessions", data),
  start: (id) => api.post(`/sessions/${id}/start`),
  end: (id) => api.post(`/sessions/${id}/end`),
  patients: (id) => api.get(`/sessions/${id}/patients`),
  saveDiagnosis: (sessionId, apptId, data) =>
    api.post(`/sessions/${sessionId}/appointments/${apptId}/diagnosis`, data),
};

export const paymentApi = {
  create: (data) => api.post("/payments", data),
  history: () => api.get("/payments/history"),
  receipt: (id) => api.get(`/payments/${id}/receipt`),
  methods: () => api.get("/payments/methods"),
  addMethod: (data) => api.post("/payments/methods", data),
  deleteMethod: (id) => api.delete(`/payments/methods/${id}`),
};

export const specializationApi = {
  list: () => api.get("/specializations"),
};

export const notificationApi = {
  list: () => api.get("/notifications"),
  unreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put("/notifications/read-all"),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export const adminApi = {
  stats: () => api.get("/admin/stats"),
  users: (params) => api.get("/admin/users", { params }),
  toggleUser: (id) => api.put(`/admin/users/${id}/toggle-active`),
  verifyDoctor: (id) => api.put(`/admin/doctors/${id}/verify`),
  appointments: (params) => api.get("/admin/appointments", { params }),
  payments: (params) => api.get("/admin/payments", { params }),
  auditLogs: (params) => api.get("/admin/audit-logs", { params }),
  specializations: () => api.get("/specializations"),
  addSpecialization: (name, code) => api.post("/admin/specializations", null, { params: { name, code } }),
  updateSpecialization: (id, name) => api.put(`/admin/specializations/${id}`, null, { params: { name } }),
  settings: () => api.get("/admin/settings"),
  updateSetting: (key, value) => api.put(`/admin/settings/${key}`, value),
};
