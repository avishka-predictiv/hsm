export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22, gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 750, letterSpacing: "-.02em", lineHeight: 1.2 }}>{title}</h1>
        {subtitle ? <p style={{ fontSize: 12.5, color: "var(--ink-mute)", marginTop: 4 }}>{subtitle}</p> : null}
      </div>
      {actions ? <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{actions}</div> : null}
    </div>
  );
}

