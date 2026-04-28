import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import "./MedReasonerModal.css";

const MEDREASONER_API =
  import.meta.env.VITE_MEDREASONER_API || "http://localhost:8100";

function buildCasePayload({ patient, appt, observedSymptoms }) {
  return {
    patient: {
      id: patient?.id,
      nic: patient?.nic,
      email: patient?.email,
      mobile: patient?.mobile,
      blood_group: patient?.blood_group,
      known_allergies: patient?.known_allergies,
      chronic_conditions: patient?.chronic_conditions,
      dob: patient?.dob,
      gender: patient?.gender,
    },
    appointment: {
      appointment_id: appt?.appointment_id,
      slot_number: appt?.slot_number,
      symptoms_text: appt?.symptoms_text,
      has_diagnosis: appt?.has_diagnosis,
    },
    symptoms_observed: observedSymptoms || "",
  };
}

export default function MedReasonerModal({
  open,
  onClose,
  patient,
  appt,
  observedSymptoms,
  initialSessionId = "",
  onSaveAsDiagnosis,
}) {
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState("");
  const [started, setStarted] = useState(false);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const casePayload = useMemo(
    () => buildCasePayload({ patient, appt, observedSymptoms }),
    [patient, appt, observedSymptoms]
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingStatus]);

  // Reset per open / appointment
  useEffect(() => {
    if (!open) return;
    setSessionId(initialSessionId || "");
    setMessages([]);
    setInput("");
    setIsLoading(false);
    setLoadingStatus("");
    setStarted(false);
  }, [open, appt?.appointment_id, initialSessionId]);

  const streamRequest = useCallback(async ({ session_id, message, caseData }) => {
    const res = await fetch(`${MEDREASONER_API}/api/case/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session_id || "",
        case: caseData || undefined,
        message: message || undefined,
      }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`MedReasoner returned ${res.status}`);
    }
    return res;
  }, []);

  const startNewCase = async () => {
    if (isLoading) return;
    setStarted(true);
    setMessages([]);
    setSessionId("");
    setIsLoading(true);
    setLoadingStatus("Starting diagnostic pipeline...");

    // Add assistant placeholder
    const assistantIndex = 0;
    setMessages([{ role: "assistant", content: "" }]);

    try {
      const res = await streamRequest({
        session_id: "",
        message: "",
        caseData: casePayload,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;
        buffer += decoder.decode(result.value || new Uint8Array(), {
          stream: !done,
        });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const rawEvent of events) {
          const line = rawEvent
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!line) continue;
          const payload = JSON.parse(line.slice(6));

          if (payload.type === "status") {
            setLoadingStatus(payload.message || "Processing...");
          } else if (payload.type === "final") {
            if (payload.session_id) setSessionId(payload.session_id);
          } else if (payload.type === "chunk") {
            setMessages((prev) =>
              prev.map((msg, idx) =>
                idx === assistantIndex
                  ? { ...msg, content: `${msg.content}${payload.content || ""}` }
                  : msg
              )
            );
          } else if (payload.type === "error") {
            throw new Error(payload.message || "Streaming failed.");
          }
        }
      }
    } catch (err) {
      console.error("[MedReasoner]", err);
      toast.error(
        `MedReasoner unavailable. Is the chat backend running on ${MEDREASONER_API}?`
      );
      setMessages([{ role: "assistant", content: "Error connecting to API." }]);
    } finally {
      setLoadingStatus("");
      setIsLoading(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!started) {
      // If user types before starting, start case first
      await startNewCase();
    }

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsLoading(true);
    setLoadingStatus("Thinking...");

    const assistantIndex = messages.length + 1;
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await streamRequest({
        session_id: sessionId,
        message: userMessage.content,
        caseData: undefined,
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;
        buffer += decoder.decode(result.value || new Uint8Array(), {
          stream: !done,
        });

        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const rawEvent of events) {
          const line = rawEvent
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!line) continue;

          const payload = JSON.parse(line.slice(6));

          if (payload.type === "status") {
            setLoadingStatus(payload.message || "Processing...");
          } else if (payload.type === "final") {
            if (!sessionId && payload.session_id) setSessionId(payload.session_id);
          } else if (payload.type === "chunk") {
            setMessages((prev) =>
              prev.map((msg, idx) =>
                idx === assistantIndex
                  ? { ...msg, content: `${msg.content}${payload.content || ""}` }
                  : msg
              )
            );
          } else if (payload.type === "error") {
            throw new Error(payload.message || "Streaming failed.");
          }
        }
      }
    } catch (err) {
      console.error("[MedReasoner]", err);
      setMessages((prev) =>
        prev.map((msg, idx) =>
          idx === assistantIndex
            ? { ...msg, content: "Error connecting to API." }
            : msg
        )
      );
      toast.error("Error connecting to MedReasoner API.");
    } finally {
      setLoadingStatus("");
      setIsLoading(false);
    }
  };

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  const handleSave = () => {
    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && (m.content || "").trim());
    if (!lastAssistant) return toast.error("No MedReasoner output to save yet.");
    onSaveAsDiagnosis?.({ text: lastAssistant.content, sessionId });
    toast.success("Saved as MedReasoner Diagnosis");
    onClose?.();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{
        background: "rgba(6, 14, 26, 0.45)",
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={(e) => {
        // close only if clicking on backdrop
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="relative w-full max-w-[1100px] h-[90vh] rounded-[22px] overflow-hidden shadow-2xl border"
        style={{ borderColor: "rgba(227, 237, 232, 0.9)" }}
      >
        {/* Close button (top-right) */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-30 w-10 h-10 rounded-xl bg-white/90 hover:bg-white flex items-center justify-center border"
          style={{ borderColor: "rgba(227, 237, 232, 0.9)" }}
          title="Close"
        >
          <X size={18} />
        </button>

        <div className="mr-modal-scope">
          <div className="app-container">
            {/* Top Bar */}
            <header className="top-bar">
              <div className="logo-group">
                <div className="logo-icon">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <span className="logo-name">CliniqReason</span>
                  <span className="logo-tag">Clinical Reasoning Agent</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="new-chat-btn" onClick={startNewCase} disabled={isLoading}>
                  <span>+</span> New Case
                </button>
                <button
                  className="new-chat-btn"
                  onClick={handleSave}
                  disabled={isLoading || messages.length === 0}
                  title="Save last MedReasoner output to diagnosis"
                >
                  Save
                </button>
              </div>
            </header>

            {/* Chat Area */}
            <div className="chat-area">
              <div className="messages-container">
                {messages.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"
                          fill="currentColor"
                        />
                      </svg>
                    </div>
                    <h2>What's the clinical picture?</h2>
                    <p>
                      Describe symptoms, history, vitals, or lab results — <br />
                      and let's reason through it together.
                    </p>
                    <div className="chip-row">
                      <span className="chip">Differential diagnosis</span>
                      <span className="chip">Investigation plan</span>
                      <span className="chip">Management steps</span>
                    </div>
                  </div>
                )}

                {messages.map((msg, index) => (
                  <div key={index} className={`message-wrapper ${msg.role}`}>
                    {msg.role === "assistant" && <div className="avatar">CR</div>}
                    <div className="message-bubble">
                      {(msg.content || "").split("\n").map((line, i) => (
                        <span key={i}>
                          {line}
                          {i < (msg.content || "").split("\n").length - 1 && <br />}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="message-wrapper assistant">
                    <div className="avatar">CR</div>
                    <div className="message-bubble loading">
                      {loadingStatus || "Thinking..."}
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} className="bottom-spacer" />
              </div>

              {/* Input */}
              <div className="input-zone">
                <form className="input-form" onSubmit={sendMessage}>
                  <textarea
                    ref={textareaRef}
                    rows="1"
                    value={input}
                    onChange={handleInput}
                    placeholder="Describe the patient case / answer clarification..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage(e);
                        if (textareaRef.current) textareaRef.current.style.height = "auto";
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="send-btn"
                    title="Send"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      width="18"
                      height="18"
                    >
                      <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                    </svg>
                  </button>
                </form>
                <p className="disclaimer">
                  CliniqReason is an AI tool. Always apply independent clinical judgment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { MEDREASONER_API };

