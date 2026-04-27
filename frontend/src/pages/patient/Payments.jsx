import { useQuery } from "@tanstack/react-query";
import { paymentApi } from "../../api";
import PageHeader from "../../components/PageHeader";
import StatCard from "../../components/StatCard";
import StatusBadge from "../../components/StatusBadge";
import Ico from "../../components/Ico";
import toast from "react-hot-toast";

function fmtDate(s) {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

function fmtCurrency(n) {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR", maximumFractionDigits: 0 }).format(Number(n));
}

export default function Payments() {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => paymentApi.history().then((r) => r.data),
  });

  const total = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const successCount = payments.filter((p) => p.status === "success").length;
  const refundedCount = payments.filter((p) => p.status === "refunded" || p.status === "partial_refund").length;

  return (
    <div className="page-enter" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Payments" subtitle="Your billing history and receipts" actions={
        <a className="btn btn-secondary btn-sm" href="/patient/payment-methods">
          <Ico n="creditCard" size={13} /> Manage Methods
        </a>
      } />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
        <StatCard icon="dollarSign" iconClass="icon-blue" label="Total Paid" value={fmtCurrency(total)} />
        <StatCard icon="check" iconClass="icon-mint" label="Successful" value={successCount} />
        <StatCard icon="xCircle" iconClass="icon-violet" label="Refunded" value={refundedCount} />
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        {isLoading ? (
          <div className="card-p">Loading…</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Method</th>
                <th>Ref</th>
                <th>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id}>
                  <td style={{ color: "var(--ink)" }}>{fmtDate(p.created_at)}</td>
                  <td style={{ textTransform: "capitalize" }}>{p.method || "—"}</td>
                  <td>
                    <span className="mono" style={{ background: "var(--muted)", padding: "2px 8px", borderRadius: 6 }}>
                      {p.transaction_ref || "—"}
                    </span>
                  </td>
                  <td style={{ fontWeight: 650, color: "var(--ink)" }}>{fmtCurrency(p.amount)}</td>
                  <td><StatusBadge status={p.status} /></td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-xs btn-secondary"
                      onClick={async () => {
                        try {
                          const { data } = await paymentApi.receipt(p.id);
                          toast(data.message || "Receipt not available yet");
                        } catch {
                          toast.error("Failed to fetch receipt");
                        }
                      }}
                    >
                      Receipt
                    </button>
                  </td>
                </tr>
              ))}
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 24 }}>
                    No payments yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

