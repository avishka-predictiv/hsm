import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { adminApi } from "../../api";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import Ico from "../../components/Ico";
import toast from "react-hot-toast";

export default function AdminDoctorVerification() {
  const [doctorId, setDoctorId] = useState("");

  const verifyMutation = useMutation({
    mutationFn: (id) => adminApi.verifyDoctor(id).then((r) => r.data),
    onSuccess: () => {
      toast.success("Doctor verified");
      setDoctorId("");
    },
    onError: (e) => toast.error(e?.response?.data?.detail || "Verification failed"),
  });

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Doctor Verification"
        subtitle="Verify doctors by Doctor ID"
      />

      <div className="card card-p" style={{ maxWidth: 640 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <label className="label">Doctor ID</label>
            <input className="input" value={doctorId} onChange={(e) => setDoctorId(e.target.value)} placeholder="Paste doctor_id (UUID)" />
          </div>
          <button
            type="button"
            className="btn btn-mint"
            disabled={!doctorId.trim() || verifyMutation.isPending}
            onClick={() => verifyMutation.mutate(doctorId.trim())}
          >
            <Ico n="checkCircle" size={15} /> Verify Doctor
          </button>
        </div>

        <div style={{ marginTop: 14, fontSize: 12.5, color: "var(--ink-mute)", lineHeight: 1.6 }}>
          This backend currently does not expose an endpoint to list unverified doctors. Once such an endpoint is added, this page can display a full queue like the design prototype.
        </div>
      </div>

      <div className="card">
        <EmptyState icon="userCheck" title="Verification queue not available" desc="Backend is missing a list-pending-doctors API. Use the Doctor ID field above for now." />
      </div>
    </div>
  );
}

