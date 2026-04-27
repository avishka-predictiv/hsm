import Ico from "./Ico";

export default function StatCard({ icon, iconClass = "icon-blue", label, value, sub, delta }) {
  return (
    <div className="stat-card">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div className={`stat-icon ${iconClass}`}>
          <Ico n={icon} size={19} />
        </div>
        {delta ? (
          <span style={{ fontSize: 11, color: "var(--mint)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <Ico n="trendingUp" size={13} color="var(--mint)" /> {delta}
          </span>
        ) : null}
      </div>
      <div style={{ fontSize: 26, fontWeight: 750, letterSpacing: "-.03em", lineHeight: 1, marginBottom: 5 }}>{value ?? "—"}</div>
      <div style={{ fontSize: 12.5, color: "var(--ink-mute)", fontWeight: 500 }}>{label}</div>
      {sub ? <div style={{ fontSize: 11.5, color: "var(--ink-dim)", marginTop: 3 }}>{sub}</div> : null}
    </div>
  );
}

