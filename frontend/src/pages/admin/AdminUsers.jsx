import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "../../api";
import { CheckCircle, XCircle, UserCheck, Search } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminUsers() {
  const qc = useQueryClient();
  const [roleFilter, setRoleFilter] = useState("");
  const { data: users = [] } = useQuery({ queryKey: ["admin-users", roleFilter], queryFn: () => adminApi.users({ role: roleFilter || undefined }).then(r => r.data) });

  const { mutate: toggle } = useMutation({ mutationFn: (id) => adminApi.toggleUser(id), onSuccess: () => { toast.success("Updated"); qc.invalidateQueries(["admin-users"]); } });
  const { mutate: verify } = useMutation({ mutationFn: (id) => adminApi.verifyDoctor(id), onSuccess: () => { toast.success("Doctor verified!"); qc.invalidateQueries(["admin-users"]); } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-fg mb-1">User Management</h1><p className="text-fg-subtle text-sm">Manage patients, doctors, and verify registrations</p></div>
      </div>

      <div className="flex gap-2">
        {["", "patient", "doctor", "admin"].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${roleFilter === r ? "bg-primary-600 text-white" : "btn-secondary"}`}>
            {r || "All"}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-line">
            <tr>{["Email", "Role", "Status", "Profile Complete", "Actions"].map(h => <th key={h} className="text-left p-4 text-xs font-semibold text-fg-subtle uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-subtle">
                <td className="p-4 text-sm text-fg">{u.email}</td>
                <td className="p-4"><span className={`badge ${u.role === "doctor" ? "badge-info" : u.role === "admin" ? "badge-warning" : "badge-neutral"}`}>{u.role}</span></td>
                <td className="p-4"><span className={`badge ${u.is_active ? "badge-success" : "badge-danger"}`}>{u.is_active ? "Active" : "Suspended"}</span></td>
                <td className="p-4"><span className={`badge ${u.profile_complete ? "badge-success" : "badge-neutral"}`}>{u.profile_complete ? "Complete" : "Pending"}</span></td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggle(u.id)} className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${u.is_active ? "border-red-500/30 text-red-400 hover:bg-red-500/10" : "border-accent-500/30 text-accent-400 hover:bg-accent-500/10"}`}>
                      {u.is_active ? "Suspend" : "Activate"}
                    </button>
                    {u.role === "doctor" && (
                      <button onClick={() => verify(u.id)} className="text-xs px-2.5 py-1 rounded-lg border border-primary-500/30 text-primary-400 hover:bg-primary-500/10 transition-colors flex items-center gap-1">
                        <UserCheck size={12} /> Verify
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-fg-subtle text-sm">No users found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
