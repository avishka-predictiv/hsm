import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { patientApi, paymentApi } from "../../api";
import { User, CreditCard, Receipt, Bell, Save, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";

const TABS = ["Profile", "Payment Methods", "Payment History", "Notifications"];

function Section({ title, children }) {
  return (
    <div className="glass-card p-6 space-y-4">
      <h3 className="font-semibold text-fg text-sm uppercase tracking-wider border-b border-line pb-3">{title}</h3>
      {children}
    </div>
  );
}

function ProfileTab() {
  const qc = useQueryClient();
  const { data: profile } = useQuery({ queryKey: ["patient-profile"], queryFn: () => patientApi.myProfile().then(r => r.data) });
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);

  const startEdit = () => setForm({ ...profile });
  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const { mutate: save, isPending } = useMutation({
    mutationFn: (data) => patientApi.updateProfile(data),
    onSuccess: () => { toast.success("Profile updated!"); qc.invalidateQueries(["patient-profile"]); setEditing(false); },
    onError: () => toast.error("Update failed"),
  });

  const p = editing ? form : profile;
  if (!p) return <div className="animate-pulse h-32 glass-card rounded-2xl" />;

  const field = (label, name, type = "text") => (
    <div>
      <label className="input-label">{label}</label>
      {editing
        ? <input type={type} name={name} value={p[name] || ""} onChange={handle} className="input-field" />
        : <p className="text-fg-muted text-sm py-2.5 px-4 bg-subtle rounded-xl border border-line">{p[name] || "—"}</p>}
    </div>
  );

  return (
    <div className="space-y-4">
      <Section title="Personal Information">
        <div className="grid grid-cols-2 gap-4">
          {field("Name", "name")}
          {field("NIC", "nic")}
          {field("Mobile", "mobile")}
          {field("Date of Birth", "dob", "date")}
          {field("Gender", "gender")}
          {field("Blood Group", "blood_group")}
          {field("Weight (kg)", "weight", "number")}
          {field("Height (cm)", "height", "number")}
        </div>
        {field("Address", "address")}
      </Section>
      <Section title="Emergency Contact">
        <div className="grid grid-cols-2 gap-4">
          {field("Contact Name", "emergency_contact_name")}
          {field("Contact Phone", "emergency_contact_phone")}
        </div>
      </Section>
      <Section title="Medical Information">
        {field("Known Allergies", "known_allergies")}
        {field("Chronic Conditions", "chronic_conditions")}
        {field("Insurance Info", "insurance_info")}
      </Section>
      <div className="flex gap-3">
        {editing ? (
          <>
            <button onClick={() => save(form)} disabled={isPending} className="btn-primary"><Save size={16} />{isPending ? "Saving..." : "Save Changes"}</button>
            <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
          </>
        ) : (
          <button onClick={startEdit} className="btn-secondary"><User size={16} />Edit Profile</button>
        )}
      </div>
    </div>
  );
}

function PaymentMethodsTab() {
  const qc = useQueryClient();
  const { data: methods = [] } = useQuery({ queryKey: ["payment-methods"], queryFn: () => paymentApi.methods().then(r => r.data) });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ type: "card", label: "", is_default: false });

  const { mutate: add } = useMutation({
    mutationFn: (d) => paymentApi.addMethod(d),
    onSuccess: () => { toast.success("Method added!"); qc.invalidateQueries(["payment-methods"]); setAdding(false); },
  });
  const { mutate: remove } = useMutation({
    mutationFn: (id) => paymentApi.deleteMethod(id),
    onSuccess: () => { toast.success("Removed"); qc.invalidateQueries(["payment-methods"]); },
  });

  return (
    <div className="space-y-4">
      <Section title="Saved Payment Methods">
        {methods.length === 0 && <p className="text-fg-subtle text-sm">No saved methods</p>}
        {methods.map(m => (
          <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-subtle border border-line">
            <div className="flex items-center gap-3">
              <CreditCard size={18} className="text-primary-600 dark:text-primary-400" />
              <div>
                <p className="text-sm font-medium text-fg">{m.label || m.type}</p>
                {m.is_default && <span className="badge badge-success">Default</span>}
              </div>
            </div>
            <button onClick={() => remove(m.id)} className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 p-1"><Trash2 size={16} /></button>
          </div>
        ))}
        {!adding ? (
          <button onClick={() => setAdding(true)} className="btn-secondary w-full justify-center"><Plus size={16} />Add Payment Method</button>
        ) : (
          <div className="p-4 rounded-xl bg-subtle border border-line space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="input-field">
                  <option value="card">Card</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="mobile">Mobile Pay</option>
                </select>
              </div>
              <div>
                <label className="input-label">Label</label>
                <input value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} className="input-field" placeholder="e.g. Visa ending 4242" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_default} onChange={e => setForm(p => ({ ...p, is_default: e.target.checked }))} className="accent-primary-500" />
              <span className="text-sm text-fg-muted">Set as default</span>
            </label>
            <div className="flex gap-2">
              <button onClick={() => add(form)} className="btn-primary">Add</button>
              <button onClick={() => setAdding(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}

function PaymentHistoryTab() {
  const { data: payments = [] } = useQuery({ queryKey: ["payment-history"], queryFn: () => paymentApi.history().then(r => r.data) });

  return (
    <Section title="Payment History">
      {payments.length === 0 && <p className="text-fg-subtle text-sm">No payments yet</p>}
      {payments.map(p => (
        <div key={p.id} className="flex items-center justify-between py-3 border-b border-line last:border-0">
          <div>
            <p className="text-sm font-medium text-fg">LKR {Number(p.amount).toFixed(2)}</p>
            <p className="text-xs text-fg-subtle">{p.transaction_ref} · {p.method}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`badge ${p.status === "success" ? "badge-success" : "badge-warning"}`}>{p.status}</span>
            <button
              onClick={() => toast("Receipt generation coming soon!", { icon: "📄" })}
              className="btn-secondary text-xs px-3 py-1.5">
              <Receipt size={13} />Receipt
            </button>
          </div>
        </div>
      ))}
    </Section>
  );
}

function NotificationsTab() {
  const qc = useQueryClient();
  const { data: prefs } = useQuery({ queryKey: ["notif-prefs"], queryFn: () => patientApi.notificationPrefs().then(r => r.data) });
  const [form, setForm] = useState(null);

  const { mutate: save, isPending } = useMutation({
    mutationFn: (d) => patientApi.updateNotificationPrefs(d),
    onSuccess: () => { toast.success("Preferences saved!"); qc.invalidateQueries(["notif-prefs"]); },
  });

  const current = form ?? prefs ?? { email: true, mobile: false };

  return (
    <Section title="Notification Preferences">
      <p className="text-fg-subtle text-sm">Choose how you'd like to receive notifications.</p>
      <div className="space-y-3 mt-2">
        {[["email", "Email Notifications", "Receive updates via email"], ["mobile", "Mobile / SMS Notifications", "Receive SMS reminders"]].map(([key, label, desc]) => (
          <label key={key} className="flex items-center justify-between p-4 rounded-xl bg-subtle border border-line cursor-pointer hover:bg-line">
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-primary-600 dark:text-primary-400" />
              <div>
                <p className="text-sm font-medium text-fg">{label}</p>
                <p className="text-xs text-fg-subtle">{desc}</p>
              </div>
            </div>
            <input type="checkbox" checked={!!current[key]} onChange={e => setForm(p => ({ ...current, ...p, [key]: e.target.checked }))}
              className="w-4 h-4 accent-primary-500" />
          </label>
        ))}
      </div>
      <button onClick={() => save(current)} disabled={isPending} className="btn-primary mt-2"><Save size={16} />{isPending ? "Saving..." : "Save Preferences"}</button>
    </Section>
  );
}

export default function PatientProfile() {
  const [tab, setTab] = useState(0);
  const icons = [User, CreditCard, Receipt, Bell];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-fg mb-1">Profile Management</h1>
        <p className="text-fg-subtle text-sm">Manage your personal information, payment methods, and notification preferences.</p>
      </div>
      <div className="flex gap-1 bg-subtle p-1 rounded-xl border border-line">
        {TABS.map((t, i) => {
          const Icon = icons[i];
          return (
            <button key={t} onClick={() => setTab(i)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${tab === i ? "bg-primary-600 text-white" : "text-fg-subtle hover:text-fg"}`}>
              <Icon size={14} />{t}
            </button>
          );
        })}
      </div>
      {tab === 0 && <ProfileTab />}
      {tab === 1 && <PaymentMethodsTab />}
      {tab === 2 && <PaymentHistoryTab />}
      {tab === 3 && <NotificationsTab />}
    </div>
  );
}
