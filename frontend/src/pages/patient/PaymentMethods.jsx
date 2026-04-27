import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentApi } from "../../api";
import PageHeader from "../../components/PageHeader";
import Modal from "../../components/Modal";
import Ico from "../../components/Ico";
import toast from "react-hot-toast";

export default function PaymentMethods() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ type: "card", label: "", is_default: false });

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => paymentApi.methods().then((r) => r.data),
  });

  const addMutation = useMutation({
    mutationFn: () => paymentApi.addMethod({ type: form.type, label: form.label || null, is_default: !!form.is_default }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Payment method added");
      setShowAdd(false);
      setForm({ type: "card", label: "", is_default: false });
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
    },
    onError: (e) => toast.error(e?.response?.data?.detail || "Failed to add method"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => paymentApi.deleteMethod(id),
    onSuccess: () => {
      toast.success("Payment method removed");
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
    },
    onError: () => toast.error("Failed to remove method"),
  });

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Payment Methods"
        subtitle="Manage your saved payment options"
        actions={
          <button className="btn btn-primary btn-sm" type="button" onClick={() => setShowAdd(true)}>
            <Ico n="plus" size={14} /> Add Method
          </button>
        }
      />

      <div className="card" style={{ maxWidth: 560, overflow: "hidden" }}>
        {isLoading ? (
          <div className="card-p">Loading…</div>
        ) : methods.length === 0 ? (
          <div className="card-p">No saved payment methods.</div>
        ) : (
          methods.map((m) => (
            <div key={m.id} className="list-item">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ico n={m.type === "card" ? "creditCard" : "dollarSign"} size={18} color="var(--ink-mute)" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13.5 }}>{m.label || m.type}</div>
                {m.is_default ? <span className="badge badge-mint" style={{ fontSize: 10 }}>Default</span> : null}
              </div>
              <button
                type="button"
                className="btn btn-xs"
                style={{ background: "rgba(244,63,94,.07)", color: "var(--rose)", border: "1px solid rgba(244,63,94,.15)" }}
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(m.id)}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Payment Method">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="label">Method type</label>
            <select className="input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
              <option value="card">Card</option>
              <option value="mobile">Mobile Money</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>
          <div>
            <label className="label">Label</label>
            <input className="input" value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} placeholder="e.g. Visa ending in 4242" />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={form.is_default} onChange={(e) => setForm((p) => ({ ...p, is_default: e.target.checked }))} />
            Set as default payment method
          </label>

          <button
            type="button"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            Add Method
          </button>
        </div>
      </Modal>
    </div>
  );
}

