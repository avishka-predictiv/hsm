import Ico from "./Ico";

export default function EmptyState({ icon = "fileText", title, desc, action, onAction }) {
  return (
    <div className="empty-state">
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          marginBottom: 8,
          background: "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Ico n={icon} size={28} color="var(--ink-mute)" />
      </div>
      <div style={{ fontWeight: 650, color: "var(--ink)" }}>{title}</div>
      {desc ? (
        <div style={{ fontSize: 13, color: "var(--ink-mute)", maxWidth: 320, textAlign: "center", lineHeight: 1.65 }}>{desc}</div>
      ) : null}
      {action ? (
        <button className="btn btn-primary btn-sm" onClick={onAction} style={{ marginTop: 12 }}>
          {action}
        </button>
      ) : null}
    </div>
  );
}

