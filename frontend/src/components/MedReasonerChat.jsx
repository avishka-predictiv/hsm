import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Brain, X, Send, Save, Loader2, Sparkles, RotateCcw, GripHorizontal } from "lucide-react";
import toast from "react-hot-toast";

const MEDREASONER_API =
  import.meta.env.VITE_MEDREASONER_API || "http://localhost:8100";

/**
 * Build the initial doctor → MedReasoner prompt from the patient/appointment
 * context so the LLM has full clinical picture from the first turn.
 */
function buildInitialPrompt({ patient, appt, observed }) {
  const lines = [];
  lines.push("You are assisting a doctor with clinical reasoning. Patient case:");
  lines.push("");
  if (patient?.gender) lines.push(`- Gender: ${patient.gender}`);
  if (patient?.dob) {
    const age = Math.max(
      0,
      Math.floor((Date.now() - new Date(patient.dob).getTime()) / 31557600000)
    );
    lines.push(`- Age: ${age} years (DOB ${patient.dob})`);
  }
  if (patient?.blood_group) lines.push(`- Blood Group: ${patient.blood_group}`);
  if (patient?.known_allergies && patient.known_allergies !== "None")
    lines.push(`- Known Allergies: ${patient.known_allergies}`);
  if (patient?.chronic_conditions)
    lines.push(`- Chronic Conditions: ${patient.chronic_conditions}`);

  if (appt?.symptoms_text) {
    lines.push("");
    lines.push(`Patient-reported symptoms (booking): ${appt.symptoms_text}`);
  }
  if (observed && observed.trim()) {
    lines.push("");
    lines.push(`Doctor's clinical observations: ${observed.trim()}`);
  }
  lines.push("");
  lines.push(
    "Please reason through the differential diagnosis. If clarification is needed, ask one focused question at a time."
  );
  return lines.join("\n");
}

function MessageBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          MR
        </div>
      )}
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
          isUser
            ? "bg-primary-600 text-white rounded-br-sm"
            : "bg-subtle border border-line text-fg rounded-bl-sm"
        }`}
      >
        {msg.content || (msg.role === "assistant" && <span className="opacity-60">…</span>)}
      </div>
    </div>
  );
}

export default function MedReasonerChat({
  open,
  onClose,
  patient,
  appt,
  observedSymptoms,
  onSaveAsDiagnosis,
  initialSessionId = "",
}) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [autoSent, setAutoSent] = useState(false);

  // Drag state
  const [pos, setPos] = useState(() => ({
    x: Math.max(20, window.innerWidth - 460),
    y: Math.max(20, window.innerHeight - 640),
  }));
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });

  const messagesEndRef = useRef(null);

  const initialPrompt = useMemo(
    () => buildInitialPrompt({ patient, appt, observed: observedSymptoms }),
    [patient, appt, observedSymptoms]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, status]);

  // Reset when (re)opening for a different appointment
  useEffect(() => {
    if (!open) return;
    setSessionId(initialSessionId || "");
    setMessages([]);
    setInput("");
    setIsLoading(false);
    setStatus("");
    setAutoSent(false);
  }, [open, appt?.appointment_id, initialSessionId]);

  const sendMessage = useCallback(
    async (text, currentSessionId) => {
      if (!text.trim()) return;
      setIsLoading(true);
      setStatus("Starting diagnostic pipeline...");

      const userMsg = { role: "user", content: text };
      const assistantPlaceholder = { role: "assistant", content: "" };

      let assistantIndex = -1;
      setMessages((prev) => {
        assistantIndex = prev.length + 1;
        return [...prev, userMsg, assistantPlaceholder];
      });

      try {
        const res = await fetch(`${MEDREASONER_API}/api/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: currentSessionId || "",
            message: text,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`MedReasoner returned ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;

        while (!done) {
          const result = await reader.read();
          done = result.done;
          buffer += decoder.decode(result.value || new Uint8Array(), { stream: !done });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const rawEvent of events) {
            const line = rawEvent.split("\n").find((l) => l.startsWith("data: "));
            if (!line) continue;
            let payload;
            try {
              payload = JSON.parse(line.slice(6));
            } catch {
              continue;
            }

            if (payload.type === "status") {
              setStatus(payload.message || "Processing...");
            } else if (payload.type === "final") {
              if (payload.session_id) setSessionId(payload.session_id);
            } else if (payload.type === "chunk") {
              setMessages((prev) =>
                prev.map((m, idx) =>
                  idx === assistantIndex
                    ? { ...m, content: `${m.content}${payload.content || ""}` }
                    : m
                )
              );
            } else if (payload.type === "error") {
              throw new Error(payload.message || "Streaming failed");
            }
          }
        }
      } catch (err) {
        console.error("[MedReasoner]", err);
        toast.error(
          `MedReasoner unavailable. Is the chat backend running on ${MEDREASONER_API}?`
        );
        setMessages((prev) =>
          prev.map((m, idx) =>
            idx === assistantIndex
              ? {
                  ...m,
                  content:
                    "⚠️ Could not reach MedReasoner. Make sure the chat service is running.",
                }
              : m
          )
        );
      } finally {
        setStatus("");
        setIsLoading(false);
      }
    },
    []
  );

  // Auto-send the initial patient context the first time the panel opens
  useEffect(() => {
    if (open && !autoSent) {
      setAutoSent(true);
      sendMessage(initialPrompt, "");
    }
  }, [open, autoSent, initialPrompt, sendMessage]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const text = input;
    setInput("");
    sendMessage(text, sessionId);
  };

  const handleSaveAsDiagnosis = () => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && m.content);
    if (!lastAssistant) {
      toast.error("No MedReasoner response yet to save.");
      return;
    }
    onSaveAsDiagnosis?.({
      text: lastAssistant.content,
      sessionId,
    });
    toast.success("Saved as MedReasoner Diagnosis");
  };

  const handleRestart = () => {
    setSessionId("");
    setMessages([]);
    setAutoSent(false);
  };

  // ---------- Drag handlers ----------
  const onDragStart = (e) => {
    const point = e.touches ? e.touches[0] : e;
    dragRef.current = {
      dragging: true,
      startX: point.clientX,
      startY: point.clientY,
      baseX: pos.x,
      baseY: pos.y,
    };
    window.addEventListener("mousemove", onDragMove);
    window.addEventListener("mouseup", onDragEnd);
    window.addEventListener("touchmove", onDragMove, { passive: false });
    window.addEventListener("touchend", onDragEnd);
  };
  const onDragMove = (e) => {
    if (!dragRef.current.dragging) return;
    if (e.cancelable) e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    const dx = point.clientX - dragRef.current.startX;
    const dy = point.clientY - dragRef.current.startY;
    const PANEL_W = 440;
    const PANEL_H = 600;
    const nx = Math.min(window.innerWidth - 60, Math.max(-PANEL_W + 60, dragRef.current.baseX + dx));
    const ny = Math.min(window.innerHeight - 60, Math.max(0, dragRef.current.baseY + dy));
    setPos({ x: nx, y: ny });
  };
  const onDragEnd = () => {
    dragRef.current.dragging = false;
    window.removeEventListener("mousemove", onDragMove);
    window.removeEventListener("mouseup", onDragEnd);
    window.removeEventListener("touchmove", onDragMove);
    window.removeEventListener("touchend", onDragEnd);
  };

  if (!open) return null;

  return (
    <div
      className="fixed z-50"
      style={{
        left: pos.x,
        top: pos.y,
        width: 440,
        height: 600,
      }}
    >
      <div className="glass-card flex flex-col h-full overflow-hidden shadow-2xl">
        {/* Header (drag handle) */}
        <div
          onMouseDown={onDragStart}
          onTouchStart={onDragStart}
          className="flex items-center justify-between px-3 py-2 border-b border-line bg-subtle cursor-move select-none"
        >
          <div className="flex items-center gap-2">
            <GripHorizontal size={14} className="text-fg-subtle" />
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white">
              <Brain size={14} />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-fg">MedReasoner</p>
              <p className="text-[10px] text-fg-subtle">CliniqReason · clinical AI</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRestart}
              title="Restart chat"
              className="p-1.5 rounded-lg hover:bg-subtle text-fg-subtle hover:text-fg"
            >
              <RotateCcw size={14} />
            </button>
            <button
              onClick={onClose}
              title="Close"
              className="p-1.5 rounded-lg hover:bg-subtle text-fg-subtle hover:text-fg"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-bg/30">
          {messages.map((m, i) => (
            <MessageBubble key={i} msg={m} />
          ))}
          {isLoading && status && (
            <div className="flex items-center gap-2 text-xs text-fg-subtle pl-9">
              <Loader2 size={12} className="animate-spin" />
              {status}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Save bar */}
        <div className="px-3 py-2 border-t border-line bg-subtle/50">
          <button
            type="button"
            onClick={handleSaveAsDiagnosis}
            disabled={isLoading || messages.length === 0}
            className="btn-primary w-full justify-center py-2 text-xs"
          >
            <Save size={13} />
            Save as MedReasoner Diagnosis
          </button>
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="px-3 py-2 border-t border-line flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isLoading ? "MedReasoner is thinking..." : "Answer or ask follow-up..."
            }
            disabled={isLoading}
            className="input-field flex-1 text-sm"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="btn-primary px-3"
          >
            {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      </div>
    </div>
  );
}

export { MEDREASONER_API };
