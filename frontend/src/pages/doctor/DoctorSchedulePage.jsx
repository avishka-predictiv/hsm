import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doctorApi } from "../../api";
import { Plus, Trash2, Pencil } from "lucide-react";
import toast from "react-hot-toast";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function DoctorSchedulePage() {
  const qc = useQueryClient();
  const [addingSchedule, setAddingSchedule] = useState(false);
  const [schedForm, setSchedForm] = useState({ day_of_week: "Mon", start_time: "09:00:00", end_time: "17:00:00", slot_duration_mins: 15, max_patients: 20 });
  const [editingSchedule, setEditingSchedule] = useState(null);

  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ["doctor-schedules"],
    queryFn: () => doctorApi.mySchedules().then((r) => r.data),
  });

  const { mutate: addSchedule } = useMutation({
    mutationFn: (d) => doctorApi.createSchedule(d),
    onSuccess: () => {
      toast.success("Schedule added!");
      qc.invalidateQueries(["doctor-schedules"]);
      setAddingSchedule(false);
      setSchedForm({ day_of_week: "Mon", start_time: "09:00:00", end_time: "17:00:00", slot_duration_mins: 15, max_patients: 20 });
    },
    onError: (e) => toast.error(e?.response?.data?.detail || "Failed to add schedule"),
  });

  const { mutate: updateSchedule } = useMutation({
    mutationFn: ({ id, data }) => doctorApi.updateSchedule(id, data),
    onSuccess: () => {
      toast.success("Schedule updated!");
      qc.invalidateQueries(["doctor-schedules"]);
      setAddingSchedule(false);
      setEditingSchedule(null);
      setSchedForm({ day_of_week: "Mon", start_time: "09:00:00", end_time: "17:00:00", slot_duration_mins: 15, max_patients: 20 });
    },
    onError: (e) => toast.error(e?.response?.data?.detail || "Failed to update schedule"),
  });

  const { mutate: deleteSchedule } = useMutation({
    mutationFn: (id) => doctorApi.deleteSchedule(id),
    onSuccess: () => {
      toast.success("Schedule deleted");
      qc.invalidateQueries(["doctor-schedules"]);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || "Failed to delete schedule"),
  });

  if (isLoading) return <div className="animate-pulse space-y-4"><div className="glass-card h-48" /></div>;

  const handleStartTimeChange = (value) => setSchedForm((prev) => ({ ...prev, start_time: `${value}:00` }));
  const handleEndTimeChange = (value) => setSchedForm((prev) => ({ ...prev, end_time: `${value}:00` }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-fg mb-1">My Schedule</h1>
          <p className="text-fg-subtle text-sm">Manage your weekly availability and time slots</p>
        </div>
        <button onClick={() => { setAddingSchedule((open) => !open); setEditingSchedule(null); }} className="btn-secondary">
          <Plus size={16} /> Add Schedule
        </button>
      </div>

      <div className="glass-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wider">Weekly Schedule</h3>
          <span className="text-xs text-fg-subtle">You can add or update your weekly session slots here.</span>
        </div>

        {schedules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line p-6 text-center text-fg-muted">
            No schedule created yet. Add your weekly availability to start receiving bookings.
          </div>
        ) : (
          <div className="space-y-3">
            {schedules.map((s) => (
              <div key={s.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-xl bg-subtle border border-line">
                <div>
                  <p className="text-sm font-medium text-fg">{s.day_of_week} · {s.start_time} — {s.end_time}</p>
                  <p className="text-xs text-fg-subtle">{s.slot_duration_mins} min slots · max {s.max_patients} patients</p>
                </div>
                <div className="flex items-center gap-2">
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
                  >
                    <Pencil size={14} /> Edit
                  </button>
                  <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={() => deleteSchedule(s.id)}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {addingSchedule && (
          <div className="p-4 rounded-xl border border-line bg-subtle space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="input-label">Day of week</label>
                <select value={schedForm.day_of_week} onChange={(e) => setSchedForm((prev) => ({ ...prev, day_of_week: e.target.value }))} className="input-field">
                  {DAYS.map((day) => <option key={day} value={day}>{day}</option>)}
                </select>
              </div>
              <div>
                <label className="input-label">Max patients</label>
                <input type="number" min={1} value={schedForm.max_patients} onChange={(e) => setSchedForm((prev) => ({ ...prev, max_patients: Number(e.target.value) }))} className="input-field" />
              </div>
              <div>
                <label className="input-label">Start time</label>
                <input type="time" value={schedForm.start_time.slice(0, 5)} onChange={(e) => handleStartTimeChange(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="input-label">End time</label>
                <input type="time" value={schedForm.end_time.slice(0, 5)} onChange={(e) => handleEndTimeChange(e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="input-label">Slot duration (mins)</label>
                <input type="number" min={5} value={schedForm.slot_duration_mins} onChange={(e) => setSchedForm((prev) => ({ ...prev, slot_duration_mins: Number(e.target.value) }))} className="input-field" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={() => {
                  if (editingSchedule) updateSchedule({ id: editingSchedule.id, data: schedForm });
                  else addSchedule(schedForm);
                }}
              >
                {editingSchedule ? "Save changes" : "Add schedule"}
              </button>
              <button type="button" className="btn-secondary flex-1" onClick={() => {
                setAddingSchedule(false);
                setEditingSchedule(null);
                setSchedForm({ day_of_week: "Mon", start_time: "09:00:00", end_time: "17:00:00", slot_duration_mins: 15, max_patients: 20 });
              }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
