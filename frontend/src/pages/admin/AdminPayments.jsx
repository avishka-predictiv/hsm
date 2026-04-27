import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api";
import { format } from "date-fns";

export default function AdminPayments() {
  const { data: payments = [] } = useQuery({ queryKey: ["admin-payments"], queryFn: () => adminApi.payments().then(r => r.data) });
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-fg mb-1">Payment Management</h1><p className="text-fg-subtle text-sm">All transactions and payment records</p></div>
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-line"><tr>{["ID", "Appointment", "Amount", "Method", "Status", "Paid At"].map(h => <th key={h} className="text-left p-4 text-xs font-semibold text-fg-subtle uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {payments.map(p => (
              <tr key={p.id} className="hover:bg-subtle">
                <td className="p-4 text-xs text-fg-subtle font-mono">{p.id.slice(0, 8)}...</td>
                <td className="p-4 text-xs text-fg-subtle font-mono">{p.appointment_id.slice(0, 8)}...</td>
                <td className="p-4 text-sm font-semibold text-accent-400">LKR {Number(p.amount).toFixed(2)}</td>
                <td className="p-4 text-sm text-fg-muted capitalize">{p.method || "—"}</td>
                <td className="p-4"><span className={`badge ${p.status === "success" ? "badge-success" : p.status === "refunded" ? "badge-warning" : "badge-danger"}`}>{p.status}</span></td>
                <td className="p-4 text-xs text-fg-subtle">{p.paid_at ? format(new Date(p.paid_at), "MMM d, yyyy HH:mm") : "—"}</td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-fg-subtle text-sm">No payments found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
