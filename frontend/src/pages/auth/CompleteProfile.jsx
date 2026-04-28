import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { authApi, specializationApi } from "../../api";
import { useQuery } from "@tanstack/react-query";
import { Activity } from "lucide-react";
import toast from "react-hot-toast";
import ThemeToggle from "../../components/ThemeToggle";

function PatientForm({ onSubmit, loading }) {
  const [form, setForm] = useState({ name: "", nic: "", mobile: "", address: "", dob: "", gender: "", blood_group: "", emergency_contact_name: "", emergency_contact_phone: "", known_allergies: "" });
  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="input-label">Full Name *</label><input name="name" required value={form.name} onChange={handle} className="input-field" placeholder="Your full name" /></div>
        <div><label className="input-label">NIC *</label><input name="nic" required value={form.nic} onChange={handle} className="input-field" placeholder="NIC number" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="input-label">Mobile *</label><input name="mobile" required value={form.mobile} onChange={handle} className="input-field" placeholder="+94 7X XXX XXXX" /></div>
      </div>
      <div><label className="input-label">Address *</label><textarea name="address" required value={form.address} onChange={handle} className="input-field" rows={2} placeholder="Full address" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="input-label">Date of Birth</label><input type="date" name="dob" value={form.dob} onChange={handle} className="input-field" /></div>
        <div><label className="input-label">Gender</label>
          <select name="gender" value={form.gender} onChange={handle} className="input-field">
            <option value="">Select</option>
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="input-label">Blood Group</label>
          <select name="blood_group" value={form.blood_group} onChange={handle} className="input-field">
            <option value="">Select</option>
            {["A+","A-","B+","B-","O+","O-","AB+","AB-"].map(g => <option key={g}>{g}</option>)}
          </select>
        </div>
        <div><label className="input-label">Emergency Contact Name</label><input name="emergency_contact_name" value={form.emergency_contact_name} onChange={handle} className="input-field" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="input-label">Emergency Contact Phone</label><input name="emergency_contact_phone" value={form.emergency_contact_phone} onChange={handle} className="input-field" /></div>
        <div><label className="input-label">Known Allergies</label><input name="known_allergies" value={form.known_allergies} onChange={handle} className="input-field" placeholder="e.g. Penicillin" /></div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
        {loading ? "Saving..." : "Complete Patient Profile"}
      </button>
    </form>
  );
}

function DoctorForm({ onSubmit, loading }) {
  const { data: specs } = useQuery({ queryKey: ["specializations"], queryFn: () => specializationApi.list().then(r => r.data) });
  const [form, setForm] = useState({ name: "", nic: "", mobile: "", reg_number: "", years_experience: "", qualifications: "", consultation_fee: "", affiliation: "", bio: "", specialization_ids: [] });
  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const toggleSpec = (id) => setForm(p => ({ ...p, specialization_ids: p.specialization_ids.includes(id) ? p.specialization_ids.filter(x => x !== id) : [...p.specialization_ids, id] }));
  const [specSearch, setSpecSearch] = useState("");
  const filtered = (specs || []).filter(s => s.name.toLowerCase().includes(specSearch.toLowerCase()));

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, years_experience: form.years_experience ? Number(form.years_experience) : undefined, consultation_fee: form.consultation_fee ? Number(form.consultation_fee) : undefined }); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="input-label">Full Name *</label><input name="name" required value={form.name} onChange={handle} className="input-field" /></div>
        <div><label className="input-label">NIC *</label><input name="nic" required value={form.nic} onChange={handle} className="input-field" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="input-label">Mobile *</label><input name="mobile" required value={form.mobile} onChange={handle} className="input-field" /></div>
      </div>
      <div><label className="input-label">Doctor Registration Number *</label><input name="reg_number" required value={form.reg_number} onChange={handle} className="input-field" placeholder="SLMC number" /></div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="input-label">Years of Experience</label><input type="number" name="years_experience" value={form.years_experience} onChange={handle} className="input-field" /></div>
        <div><label className="input-label">Consultation Fee (LKR)</label><input type="number" name="consultation_fee" value={form.consultation_fee} onChange={handle} className="input-field" /></div>
      </div>
      <div><label className="input-label">Hospital / Clinic Affiliation</label><input name="affiliation" value={form.affiliation} onChange={handle} className="input-field" /></div>
      <div><label className="input-label">Qualifications</label><textarea name="qualifications" value={form.qualifications} onChange={handle} className="input-field" rows={2} placeholder="e.g. MBBS, MD Cardiology" /></div>
      <div><label className="input-label">Short Bio</label><textarea name="bio" value={form.bio} onChange={handle} className="input-field" rows={2} /></div>

      {/* Specialization multi-select */}
      <div>
        <label className="input-label">Specializations * <span className="text-primary-600 dark:text-primary-400">({form.specialization_ids.length} selected)</span></label>
        <input value={specSearch} onChange={e => setSpecSearch(e.target.value)} className="input-field mb-2" placeholder="Search specializations..." />
        <div className="max-h-40 overflow-y-auto rounded-xl border border-line bg-subtle p-2 space-y-1">
          {filtered.slice(0, 50).map(s => (
            <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-line cursor-pointer">
              <input type="checkbox" checked={form.specialization_ids.includes(s.id)} onChange={() => toggleSpec(s.id)} className="accent-primary-500" />
              <span className="text-sm text-fg-muted">{s.name}</span>
            </label>
          ))}
        </div>
        {form.specialization_ids.length === 0 && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Please select at least one specialization</p>}
      </div>

      <button type="submit" disabled={loading || form.specialization_ids.length === 0} className="btn-primary w-full justify-center py-3 disabled:opacity-50">
        {loading ? "Saving..." : "Complete Doctor Profile"}
      </button>
    </form>
  );
}

export default function CompleteProfile() {
  const { user, setUser, loadUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role || location.state?.role || "patient";
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If user is already complete, don't let them get stuck here.
    if (user?.profile_complete) {
      navigate(user.role === "doctor" ? "/doctor" : "/patient", { replace: true });
    }
  }, [user, navigate]);

  const submit = async (data) => {
    setLoading(true);
    try {
      // Drop empty optional fields so Pydantic Optional[date] / Optional[int]
      // etc. accept them as "missing" rather than rejecting empty strings.
      const clean = Object.fromEntries(
        Object.entries(data).filter(
          ([, v]) => v !== "" && v !== undefined && v !== null
        )
      );
      if (role === "patient") await authApi.completePatientProfile(clean);
      else await authApi.completeDoctorProfile(clean);

      // Avoid a redirect "bounce" where ProtectedRoute still sees the old
      // user state (profile_complete: false) during navigation.
      setUser((prev) => (prev ? { ...prev, role, profile_complete: true } : prev));

      toast.success("Profile completed!");
      navigate(role === "doctor" ? "/doctor" : "/patient", { replace: true });

      // Refresh user state in the background (don't block navigation).
      loadUser();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d) => `${d.loc?.slice(-1)[0] ?? "field"}: ${d.msg}`).join("; ")
        : detail || "Failed to save profile";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-hero-gradient flex items-center justify-center p-6 relative">
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-primary-600/30 border border-primary-500/30"><Activity className="text-primary-600 dark:text-primary-400" size={22} /></div>
          <span className="font-bold text-xl text-gradient">HMS</span>
        </div>
        <div className="glass-card p-8">
          <h1 className="text-2xl font-bold text-fg mb-1">Complete Your Profile</h1>
          <p className="text-fg-subtle text-sm mb-6">
            {role === "patient" ? "Tell us a bit about yourself to personalize your experience." : "Set up your doctor profile to appear in searches and accept bookings."}
          </p>
          {!user ? (
            <div className="space-y-4">
              <div className="card card-p">
                You’re not signed in. Please log in to complete your profile.
              </div>
              <button className="btn-primary w-full justify-center py-3" type="button" onClick={() => navigate("/login", { replace: true })}>
                Go to Login
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {role === "patient" ? <PatientForm onSubmit={submit} loading={loading} /> : <DoctorForm onSubmit={submit} loading={loading} />}
              <button
                type="button"
                disabled={loading}
                className="btn-secondary w-full justify-center py-3"
                onClick={() => { logout(); navigate("/login", { replace: true }); }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
