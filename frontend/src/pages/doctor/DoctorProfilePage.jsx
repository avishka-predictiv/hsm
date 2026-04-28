import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doctorApi, specializationApi } from "../../api";
import { Save, User } from "lucide-react";
import toast from "react-hot-toast";

export default function DoctorProfilePage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [specSearch, setSpecSearch] = useState("");

  const { data: profile } = useQuery({ queryKey: ["doctor-profile"], queryFn: () => doctorApi.myProfile().then(r => r.data) });
  const { data: specs = [] } = useQuery({ queryKey: ["specializations"], queryFn: () => specializationApi.list().then(r => r.data) });

  const { mutate: save, isPending } = useMutation({
    mutationFn: (d) => doctorApi.updateProfile(d),
    onSuccess: () => { toast.success("Profile updated!"); qc.invalidateQueries(["doctor-profile"]); setEditing(false); },
  });

  const p = editing ? form : profile;
  if (!p) return <div className="animate-pulse space-y-4"><div className="glass-card h-48" /></div>;

  const filtered = specs.filter(s => s.name.toLowerCase().includes(specSearch.toLowerCase()));
  const selectedSpecIds = (editing ? form?.specialization_ids : profile?.specializations?.map(s => s.id)) || [];
  const toggleSpec = (id) => setForm(prev => ({ ...prev, specialization_ids: prev.specialization_ids?.includes(id) ? prev.specialization_ids.filter(x => x !== id) : [...(prev.specialization_ids || []), id] }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fg mb-1">Doctor Profile</h1>
          <p className="text-fg-subtle text-sm">Manage your personal and professional profile details.</p>
        </div>
        {!editing ? (
          <button onClick={() => { setEditing(true); setForm({ ...profile, specialization_ids: profile?.specializations?.map(s => s.id) || [] }); }} className="btn-secondary"><User size={16} />Edit Profile</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => save(form)} disabled={isPending} className="btn-primary"><Save size={16} />{isPending ? "Saving..." : "Save"}</button>
            <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
          </div>
        )}
      </div>

      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">Personal Information</h3>
        <div className="grid grid-cols-2 gap-4">
          {[["Name", "name"], ["Mobile", "mobile"]].map(([label, name, type = "text"]) => (
            <div key={name}>
              <label className="input-label">{label}</label>
              {editing ? <input type={type} name={name} value={form[name] || ""} onChange={e => setForm(prev => ({ ...prev, [name]: e.target.value }))} className="input-field" />
                : <p className="py-2.5 px-4 text-sm text-fg-muted bg-subtle border border-line rounded-xl">{profile?.[name] || "—"}</p>}
            </div>
          ))}
        </div>
      </div>
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">Professional Information</h3>
        <div className="grid grid-cols-2 gap-4">
          {[["Years Experience", "years_experience", "number"], ["Consultation Fee (LKR)", "consultation_fee", "number"], ["Hospital Affiliation", "affiliation"]].map(([label, name, type = "text"]) => (
            <div key={name}>
              <label className="input-label">{label}</label>
              {editing ? <input type={type} name={name} value={form[name] || ""} onChange={e => setForm(prev => ({ ...prev, [name]: e.target.value }))} className="input-field" />
                : <p className="py-2.5 px-4 text-sm text-fg-muted bg-subtle border border-line rounded-xl">{profile?.[name] || "—"}</p>}
            </div>
          ))}
        </div>
        <div>
          <label className="input-label">Qualifications</label>
          {editing ? <textarea value={form.qualifications || ""} onChange={e => setForm(prev => ({ ...prev, qualifications: e.target.value }))} className="input-field" rows={2} />
            : <p className="py-2.5 px-4 text-sm text-fg-muted bg-subtle border border-line rounded-xl">{profile?.qualifications || "—"}</p>}
        </div>
        <div>
          <label className="input-label">Bio</label>
          {editing ? <textarea value={form.bio || ""} onChange={e => setForm(prev => ({ ...prev, bio: e.target.value }))} className="input-field" rows={3} />
            : <p className="py-2.5 px-4 text-sm text-fg-muted bg-subtle border border-line rounded-xl">{profile?.bio || "—"}</p>}
        </div>
      </div>

      {/* Specializations */}
      <div className="glass-card p-6 space-y-3">
        <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">Specializations</h3>
        {editing ? (
          <>
            <input value={specSearch} onChange={e => setSpecSearch(e.target.value)} className="input-field" placeholder="Search..." />
            <div className="max-h-48 overflow-y-auto space-y-1 border border-line rounded-xl p-2 bg-subtle">
              {filtered.slice(0, 60).map(s => (
                <label key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-line cursor-pointer">
                  <input type="checkbox" checked={selectedSpecIds.includes(s.id)} onChange={() => toggleSpec(s.id)} className="accent-primary-500" />
                  <span className="text-sm text-fg-muted">{s.name}</span>
                </label>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile?.specializations?.length === 0 && <p className="text-fg-subtle text-sm">No specializations added</p>}
            {profile?.specializations?.map(s => <span key={s.id} className="badge badge-info">{s.name}</span>)}
          </div>
        )}
      </div>

    </div>
  );
}
