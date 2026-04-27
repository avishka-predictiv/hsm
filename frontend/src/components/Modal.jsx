import Ico from "./Ico";

export default function Modal({ open, onClose, title, children, maxWidth = 480 }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontWeight: 750, fontSize: 17 }}>{title}</div>
          <button className="btn-ghost btn-icon" onClick={onClose} type="button" aria-label="Close dialog">
            <Ico n="x" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

