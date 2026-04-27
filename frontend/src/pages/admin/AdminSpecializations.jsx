import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi, specializationApi } from "../../api";
import { Plus, Search, Edit2, Check } from "lucide-react";
import toast from "react-hot-toast";

export default function AdminSpecializations() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", code: "" });
  const [editing, setEditing] = useState(null);

  const { data: specs = [] } = useQuery({ queryKey: ["specializations"], queryFn: () => specializationApi.list().then(r => r.data) });

  const { mutate: add } = useMutation({
    mutationFn: (d) => adminApi.addSpecialization(d.name, d.code),
    onSuccess: () => { toast.success("Added!"); qc.invalidateQueries(["specializations"]); setAdding(false); setForm({ name: "", code: "" }); },
  });
  const { mutate: update } = useMutation({
    mutationFn: ({ id, name }) => adminApi.updateSpecialization(id, name),
    onSuccess: () => { toast.success("Updated!"); qc.invalidateQueries(["specializations"]); setEditing(null); },
  });

  const filtered = specs.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-fg mb-1">Specializations</h1><p className="text-fg-subtle text-sm">{specs.length} specializations in the system</p></div>
        <button onClick={() => setAdding(p => !p)} className="btn-primary"><Plus size={16} />Add New</button>
      </div>

      {adding && (
        <div className="glass-card p-5 space-y-3">
          <h3 className="font-semibold text-fg">Add Specialization</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="input-label">Code</label><input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className="input-field" placeholder="e.g. 1234" /></div>
            <div><label className="input-label">Name</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="input-field" placeholder="Specialization name" /></div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => add(form)} className="btn-primary">Add</button>
            <button onClick={() => setAdding(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-dim" />
        <input value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10" placeholder="Search specializations..." />
      </div>

      <div className="glass-card overflow-hidden max-h-[60vh] overflow-y-auto">
        <table className="w-full">
          <thead className="border-b border-line sticky top-0 bg-panel/90 backdrop-blur">
            <tr>{["Code", "Name", "Doctors", "Actions"].map(h => <th key={h} className="text-left p-4 text-xs font-semibold text-fg-subtle uppercase tracking-wider">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-subtle">
                <td className="p-4 text-xs font-mono text-fg-subtle">{s.code}</td>
                <td className="p-4 text-sm text-fg">
                  {editing?.id === s.id
                    ? <input value={editing.name} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} className="input-field py-1.5 text-xs" />
                    : s.name}
                </td>
                <td className="p-4 text-xs text-fg-subtle">{s.doctors?.length ?? 0}</td>
                <td className="p-4">
                  {editing?.id === s.id
                    ? <button onClick={() => update({ id: s.id, name: editing.name })} className="text-accent-400 hover:text-accent-300 p-1"><Check size={14} /></button>
                    : <button onClick={() => setEditing({ id: s.id, name: s.name })} className="text-fg-subtle hover:text-fg p-1"><Edit2 size={14} /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
