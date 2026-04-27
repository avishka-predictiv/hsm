import { useQuery } from "@tanstack/react-query";
import { adminApi } from "../../api";
import { format } from "date-fns";

export default function AdminAuditLogs() {
  const { data: logs = [] } = useQuery({ queryKey: ["audit-logs"], queryFn: () => adminApi.auditLogs().then(r => r.data) });
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold text-fg mb-1">Audit Logs</h1><p className="text-fg-subtle text-sm">Login history and sensitive system actions</p></div>
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-line"><tr>{["Timestamp", "Actor", "Action", "Target", "Target ID"].map(h => <th key={h} className="text-left p-4 text-xs font-semibold text-fg-subtle uppercase tracking-wider">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-subtle">
                <td className="p-4 text-xs text-fg-subtle">{l.timestamp ? format(new Date(l.timestamp), "MMM d HH:mm:ss") : "—"}</td>
                <td className="p-4 text-xs font-mono text-fg-muted">{l.actor_id?.slice(0, 8) || "system"}...</td>
                <td className="p-4"><span className="badge badge-info">{l.action}</span></td>
                <td className="p-4 text-xs text-fg-muted">{l.target_type || "—"}</td>
                <td className="p-4 text-xs font-mono text-fg-subtle">{l.target_id?.slice(0, 8) || "—"}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-fg-subtle text-sm">No audit logs yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
