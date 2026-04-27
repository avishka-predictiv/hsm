import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doctorApi, specializationApi } from "../../api";
import { Save, Plus, Trash2, User, Pencil } from "lucide-react";
import toast from "react-hot-toast";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function DoctorProfilePage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [specSearch, setSpecSearch] = useState("");
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [schedForm, setSchedForm] = useState({ day_of_week: "Mon", start_time: "09:00:00", end_time: "17:00:00", slot_duration_mins: 15, max_patients: 20 });
  const [editingSchedule, setEditingSchedule] = useState(null);

  const { data: profile } = useQuery({ queryKey: ["doctor-profile"], queryFn: () => doctorApi.myProfile().then(r => r.data) });
  const { data: specs = [] } = useQuery({ queryKey: ["specializations"], queryFn: () => specializationApi.list().then(r => r.data) });
  const { data: schedules = [] } = useQuery({ queryKey: ["doctor-schedules"], queryFn: () => doctorApi.mySchedules().then(r => r.data) });

  const { mutate: save, isPending } = useMutation({
    mutationFn: (d) => doctorApi.updateProfile(d),
    onSuccess: () => { toast.success("Profile updated!"); qc.invalidateQueries(["doctor-profile"]); setEditing(false); },
  });

  const { mutate: addSchedule } = useMutation({
    mutationFn: (d) => doctorApi.createSchedule(d),
    onSuccess: () => { toast.success("Schedule added!"); qc.invalidateQueries(["doctor-schedules"]); setAddingSchedule(false); },
  });

  const { mutate: updateSchedule } = useMutation({
    mutationFn: ({ id, data }) => doctorApi.updateSchedule(id, data),
    onSuccess: () => { toast.success("Schedule updated!"); qc.invalidateQueries(["doctor-schedules"]); setAddingSchedule(false); setEditingSchedule(null); },
    onError: (e) => toast.error(e?.response?.data?.detail || "Failed to update schedule"),
  });

  const { mutate: deleteSchedule } = useMutation({
    mutationFn: (id) => doctorApi.deleteSchedule(id),
    onSuccess: () => { toast.success("Schedule deleted"); qc.invalidateQueries(["doctor-schedules"]); },
    onError: (e) => toast.error(e?.response?.data?.detail || "Failed to delete schedule"),
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
          <p className="text-fg-subtle text-sm">Manage your professional information and schedule</p>
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

      {/* Profile fields */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">Professional Information</h3>
        <div className="grid grid-cols-2 gap-4">
          {[["Mobile", "mobile"], ["Years Experience", "years_experience", "number"], ["Consultation Fee (LKR)", "consultation_fee", "number"], ["Hospital Affiliation", "affiliation"]].map(([label, name, type = "text"]) => (
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

      {/* Schedules */}
      <div className="glass-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">Weekly Schedule</h3>
          <button onClick={() => setAddingSchedule(p => !p)} className="btn-secondary text-xs px-3 py-1.5"><Plus size={14} />Add Slot</button>
        </div>
        {schedules.map(s => (
          <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-subtle border border-line">
            <div>
              <p className="text-sm font-medium text-fg">{s.day_of_week} · {s.start_time} — {s.end_time}</p>
              <p className="text-xs text-fg-subtle">{s.slot_duration_mins}min slots · max {s.max_patients} patients</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`badge ${s.is_active ? "badge-success" : "badge-neutral"}`}>{s.is_active ? "Active" : "Inactive"}</span>
              <button
                type="button"
                className="btn-secondary text-xs px-2 py-1"
                onClick={() => {
                  setAddingSchedule(true);
                  setEditingSchedule(s);
                  setSchedForm({
                    day_of_week: s.day_of_week,
                    start_time: s.start_time,
                    end_time: s.end_time,
                    slot_duration_mins: s.slot_duration_mins,
                    max_patients: s.max_patients,
                  });
                }}
                title="Edit"
              >
                <Pencil size={14} />
              </button>
              <button
                type="button"
                className="btn-secondary text-xs px-2 py-1"
                onClick={() => deleteSchedule(s.id)}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {addingSchedule && (
          <div className="p-4 rounded-xl border border-line bg-subtle space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Day</label>
                <select value={schedForm.day_of_week} onChange={e => setSchedForm(p => ({ ...p, day_of_week: e.target.value }))} className="input-field">
                  {DAYS.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Max Patients</label>
                <input type="number" value={schedForm.max_patients} onChange={e => setSchedForm(p => ({ ...p, max_patients: Number(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <label className="input-label">Start Time</label>
                <input type="time" value={schedForm.start_time.slice(0, 5)} onChange={e => setSchedForm(p => ({ ...p, start_time: e.target.value + ":00" }))} className="input-field" />
              </div>
              <div>
                <label className="input-label">End Time</label>
                <input type="time" value={schedForm.end_time.slice(0, 5)} onChange={e => setSchedForm(p => ({ ...p, end_time: e.target.value + ":00" }))} className="input-field" />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (editingSchedule) updateSchedule({ id: editingSchedule.id, data: schedForm });
                  else addSchedule(schedForm);
                }}
                className="btn-primary"
              >
                {editingSchedule ? "Save" : "Add"}
              </button>
              <button
                onClick={() => { setAddingSchedule(false); setEditingSchedule(null); }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
