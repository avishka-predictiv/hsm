import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api";
import { format } from "date-fns";

export default function AdminAppointments() {
  const { data: appointments = [] } = useQuery({ queryKey: ["admin-appointments"], queryFn: () => adminApi.appointments().then(r => r.data) });
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-fg mb-1">Appointments</h1><p className="text-fg-subtle text-sm">All appointments across the system</p></div>
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-line"><tr>{["ID", "Patient", "Doctor", "Slot", "Status", "Booked At", "Cancellation"].map(h => <th key={h} className="text-left p-4 text-xs font-semibold text-fg-subtle uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {appointments.map(a => (
              <tr key={a.id} className="hover:bg-subtle">
                <td className="p-4 text-xs text-fg-subtle font-mono">{a.id.slice(0, 8)}...</td>
                <td className="p-4 text-sm text-fg-muted">{a.patient_id.slice(0, 8)}...</td>
                <td className="p-4 text-sm text-fg-muted">{a.doctor_id.slice(0, 8)}...</td>
                <td className="p-4 text-sm text-fg-muted">#{a.slot_number}</td>
                <td className="p-4"><span className={`badge ${a.status === "completed" ? "badge-success" : a.status === "confirmed" ? "badge-info" : a.status.includes("withdrawn") || a.status.includes("absent") ? "badge-danger" : "badge-neutral"}`}>{a.status.replace("_", " ")}</span></td>
                <td className="p-4 text-xs text-fg-subtle">{a.booked_at ? format(new Date(a.booked_at), "MMM d, yyyy") : "—"}</td>
                <td className="p-4 text-xs text-fg-subtle">{a.cancellation_reason || "—"}</td>
              </tr>
            ))}
            {appointments.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-fg-subtle text-sm">No appointments found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
