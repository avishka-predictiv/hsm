import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { patientApi } from "../../api";
import PageHeader from "../../components/PageHeader";
import Ico from "../../components/Ico";
import toast from "react-hot-toast";
import { useState } from "react";

export default function NotificationSettings() {
  const qc = useQueryClient();
  const { data: prefs, isLoading } = useQuery({
    queryKey: ["notification-prefs"],
    queryFn: () => patientApi.notificationPrefs().then((r) => r.data),
  });

  const [local, setLocal] = useState({ email: true, mobile: false });

  const mutation = useMutation({
    mutationFn: (next) => patientApi.updateNotificationPrefs(next).then((r) => r.data),
    onSuccess: () => {
      toast.success("Preferences saved");
      qc.invalidateQueries({ queryKey: ["notification-prefs"] });
    },
    onError: () => toast.error("Failed to save preferences"),
  });

  const state = prefs ?? local;

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Notification Settings" subtitle="Choose how you'd like to be notified" />

      <div className="card card-p" style={{ maxWidth: 560 }}>
        {isLoading && !prefs ? (
          <div>Loading…</div>
        ) : (
          <>
            {[
              {
                key: "email",
                label: "Email Notifications",
                sub: "Appointment confirmations, reminders, and receipts sent to your email",
              },
              {
                key: "mobile",
                label: "Mobile Notifications",
                sub: "SMS alerts for upcoming appointments and important updates",
              },
            ].map((n, i) => (
              <div key={n.key}>
                {i > 0 ? <hr className="divider" style={{ margin: "20px 0" }} /> : null}
                <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 650, marginBottom: 3 }}>{n.label}</div>
                    <div style={{ fontSize: 13, color: "var(--ink-mute)" }}>{n.sub}</div>
                  </div>
                  <button
                    type="button"
                    className={`toggle ${state[n.key] ? "on" : ""}`}
                    onClick={() => {
                      const next = { ...state, [n.key]: !state[n.key] };
                      setLocal(next);
                      mutation.mutate(next);
                    }}
                    aria-pressed={!!state[n.key]}
                    aria-label={n.label}
                  />
                </div>
              </div>
            ))}

            <div style={{ marginTop: 24 }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => mutation.mutate(state)}
                disabled={mutation.isPending}
              >
                <Ico n="save" size={13} /> Save Preferences
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

