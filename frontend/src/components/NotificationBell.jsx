import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow, parseISO } from "date-fns";
import { notificationApi } from "../api";
import Ico from "./Ico";
import toast from "react-hot-toast";

const TYPE_ICON = {
  appointment_booked: "calendarCheck",
  appointment_cancelled: "calendarX",
  payment_success: "creditCard",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const qc = useQueryClient();

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationApi.list().then((r) => r.data),
    refetchInterval: 30000,
  });

  const { data: countData } = useQuery({
    queryKey: ["notifications-count"],
    queryFn: () => notificationApi.unreadCount().then((r) => r.data),
    refetchInterval: 30000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["notifications"] });
    qc.invalidateQueries({ queryKey: ["notifications-count"] });
  };

  const markRead = useMutation({
    mutationFn: (id) => notificationApi.markRead(id),
    onSuccess: invalidate,
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: invalidate,
  });

  // Show a toast whenever a new unread notification arrives
  const seenIds = useRef(null);
  useEffect(() => {
    if (notifications.length === 0) return;
    const ids = new Set(notifications.map((n) => n.id));
    if (seenIds.current === null) {
      // First load — just record what's already there, no toasts
      seenIds.current = ids;
      return;
    }
    notifications
      .filter((n) => !n.is_read && !seenIds.current.has(n.id) && n.type !== "appointment_cancelled")
      .forEach((n) => {
        toast.success(n.message, { duration: 5000 });
      });
    seenIds.current = ids;
  }, [notifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function onMouseDown(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const unread = countData?.count ?? 0;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="btn-ghost btn-icon"
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        style={{ position: "relative" }}
      >
        <Ico n="bell" size={18} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: "var(--rose)",
              border: "1.5px solid var(--panel)",
              color: "#fff",
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
              lineHeight: 1,
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 340,
            maxHeight: 440,
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.13)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            zIndex: 200,
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14 }}>
              Notifications
              {unread > 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    background: "var(--brand-500)",
                    color: "#fff",
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 700,
                    padding: "1px 6px",
                  }}
                >
                  {unread} new
                </span>
              )}
            </div>
            {unread > 0 && (
              <button
                className="btn-ghost"
                style={{ fontSize: 12, padding: "3px 8px", borderRadius: 6 }}
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                type="button"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ overflowY: "auto", flex: 1 }}>
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "36px 16px",
                  textAlign: "center",
                  color: "var(--ink-mute)",
                  fontSize: 13,
                }}
              >
                <Ico n="bellOff" size={28} />
                <div style={{ marginTop: 10, fontWeight: 500 }}>No notifications yet</div>
                <div style={{ fontSize: 12, marginTop: 4, opacity: 0.7 }}>
                  You'll see appointment and payment updates here
                </div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.is_read) markRead.mutate(n.id);
                  }}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--border)",
                    cursor: n.is_read ? "default" : "pointer",
                    background: n.is_read ? "transparent" : "rgba(26,127,230,0.05)",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    transition: "background 0.15s",
                  }}
                >
                  {/* Unread dot */}
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: n.is_read ? "transparent" : "var(--brand-500)",
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: n.is_read ? 500 : 650,
                        fontSize: 13,
                        marginBottom: 2,
                        color: "var(--ink)",
                      }}
                    >
                      {n.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ink-mute)",
                        lineHeight: 1.5,
                        wordBreak: "break-word",
                      }}
                    >
                      {n.message}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ink-mute)",
                        marginTop: 5,
                        opacity: 0.65,
                      }}
                    >
                      {formatDistanceToNow(parseISO(n.sent_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
