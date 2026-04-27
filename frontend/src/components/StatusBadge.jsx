const MAP = {
  confirmed: ["badge-mint", "Confirmed"],
  scheduled: ["badge-mint", "Scheduled"],
  active: ["badge-mint", "Active"],
  success: ["badge-mint", "Success"],
  completed: ["badge-blue", "Completed"],
  pending: ["badge-amber", "Pending"],
  unverified: ["badge-amber", "Pending Verification"],
  cancelled: ["badge-rose", "Cancelled"],
  doctor_withdrawn: ["badge-rose", "Withdrawn"],
  patient_withdrawn: ["badge-rose", "Cancelled"],
  doctor_absent: ["badge-rose", "Absent"],
  patient_absent: ["badge-rose", "No-show"],
  failed: ["badge-rose", "Failed"],
  refunded: ["badge-violet", "Refunded"],
  partial_refund: ["badge-violet", "Partial Refund"],
  full_refund: ["badge-violet", "Full Refund"],
  verified: ["badge-mint", "Verified"],
  online: ["badge-mint", "Online"],
};

export default function StatusBadge({ status }) {
  const [cls, label] = MAP[status] || ["badge-neutral", String(status || "—")];
  return <span className={`badge ${cls}`}>{label}</span>;
}

