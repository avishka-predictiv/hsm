import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { X, ExternalLink, Save, RefreshCw } from "lucide-react";

const MEDREASONER_UI =
  import.meta.env.VITE_MEDREASONER_UI || "";

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

function buildSuggestedPrompt({ casePayload }) {
  const p = casePayload?.patient || {};
  const a = casePayload?.appointment || {};
  const lines = [];
 if (casePayload?.symptoms_observed) lines.push(`Symptoms observed (doctor): ${casePayload.symptoms_observed}`);
  const hx = [];
  if (p.chronic_conditions) hx.push(`Chronic conditions: ${p.chronic_conditions}`);
  if (p.known_allergies) hx.push(`Known allergies: ${p.known_allergies}`);
  if (p.blood_group) hx.push(`Blood group: ${p.blood_group}`);
  if (p.gender) hx.push(`Gender: ${p.gender}`);
  if (p.dob) hx.push(`DOB: ${p.dob}`);
  if (hx.length) lines.push(`Past / background: ${hx.join(" | ")}`);
  return lines.join("\n");
}

/**
 * MedReasonerModal — embeds the standalone CliniqReason chat app
 * (running at VITE_MEDREASONER_UI, e.g. http://localhost:5174) inside
 * an iframe widget. Communicates with the embedded app via
 * window.postMessage so diagnoses can flow back to the diagnosis form.
 *
 * Messages sent FROM parent (this app) TO iframe:
 *   { source: "hms", type: "init",  case, sessionId }
 *   { source: "hms", type: "request-save" }   // ask iframe to send latest diagnosis
 *
 * Messages expected FROM iframe TO parent:
 *   { source: "medreasoner", type: "ready" }
 *   { source: "medreasoner", type: "session", sessionId }
 *   { source: "medreasoner", type: "diagnosis", text, sessionId }   // user clicked "Save" inside chat
 */
export default function MedReasonerModal({
  open,
  onClose,
  patient,
  appt,
  observedSymptoms,
  initialSessionId = "",
  onSaveAsDiagnosis,
}) {
  const iframeRef = useRef(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [iframeKey, setIframeKey] = useState(0);
  const hmsAccessToken = useMemo(() => localStorage.getItem("access_token") || "", [open]);

  const casePayload = useMemo(
    () => buildCasePayload({ patient, appt, observedSymptoms }),
    [patient, appt, observedSymptoms]
  );
  const suggestedPrompt = useMemo(
    () => buildSuggestedPrompt({ casePayload }),
    [casePayload]
  );

  // Build the iframe URL, passing case context as a URL param so the chat
  // app can pre-populate even before postMessage handshake completes.
  const iframeSrc = useMemo(() => {
    if (!open) return "";
    const params = new URLSearchParams({
      embed: "1",
      origin: window.location.origin,
    });
    if (initialSessionId) params.set("session_id", initialSessionId);
    try {
      params.set("case", btoa(unescape(encodeURIComponent(JSON.stringify(casePayload)))));
    } catch {
      // ignore; we'll still postMessage init below
    }
    return `${MEDREASONER_UI}/?${params.toString()}`;
  }, [open, casePayload, initialSessionId]);

  // Reset on (re)open / appointment change
  useEffect(() => {
    if (!open) return;
    setIframeReady(false);
    setSessionId(initialSessionId || "");
  }, [open, appt?.appointment_id, initialSessionId]);

  // Listen for messages from the embedded chat
  useEffect(() => {
    if (!open) return;

    const onMessage = (event) => {
      // Only trust messages coming from the configured chat origin
      let chatOrigin;
      try {
        chatOrigin = new URL(MEDREASONER_UI).origin;
      } catch {
        chatOrigin = MEDREASONER_UI;
      }
      if (event.origin !== chatOrigin) return;

      const data = event.data;
      if (!data || data.source !== "medreasoner") return;

      switch (data.type) {
        case "ready": {
          setIframeReady(true);
          // Send initial case context once the chat tells us it's ready
          iframeRef.current?.contentWindow?.postMessage(
            {
              source: "hms",
              type: "init",
              case: casePayload,
              sessionId: initialSessionId || "",
              auth: {
                type: "hms_access_token",
                access_token: hmsAccessToken,
              },
              ui: {
                autorun: true,
                prefill_message: suggestedPrompt,
              },
            },
            chatOrigin
          );
          break;
        }
        case "session":
          if (data.sessionId) setSessionId(data.sessionId);
          break;
        case "diagnosis":
          if (data.text) {
            onSaveAsDiagnosis?.({
              text: data.text,
              sessionId: data.sessionId || sessionId || "",
            });
            toast.success("Saved as MedReasoner Diagnosis");
            onClose?.();
          } else {
            toast.error("No MedReasoner output to save yet.");
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [open, casePayload, initialSessionId, onSaveAsDiagnosis, sessionId, onClose]);

  const requestSaveFromIframe = useCallback(() => {
    let chatOrigin;
    try {
      chatOrigin = new URL(MEDREASONER_UI).origin;
    } catch {
      chatOrigin = "*";
    }
    iframeRef.current?.contentWindow?.postMessage(
      { source: "hms", type: "request-save" },
      chatOrigin
    );
  }, []);

  const reload = useCallback(() => {
    setIframeReady(false);
    setIframeKey((k) => k + 1);
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{
        background: "rgba(6, 14, 26, 0.45)",
        backdropFilter: "blur(8px)",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="relative w-full max-w-[1200px] h-[92vh] rounded-[22px] overflow-hidden shadow-2xl border bg-bg flex flex-col"
        style={{ borderColor: "rgba(227, 237, 232, 0.9)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-subtle/40 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              CR
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-fg text-sm truncate">
                CliniqReason — MedReasoner
              </p>
              <p className="text-xs text-fg-subtle truncate">
                {iframeReady ? "Connected" : "Loading chat widget…"} ·{" "}
                <span className="font-mono">{MEDREASONER_UI}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={reload}
              className="btn-secondary text-xs"
              title="Reload chat"
            >
              <RefreshCw size={13} />
              Reload
            </button>
            <a
              href={iframeSrc || MEDREASONER_UI}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary text-xs"
              title="Open in new tab"
            >
              <ExternalLink size={13} />
              Open
            </a>
            <button
              type="button"
              onClick={requestSaveFromIframe}
              className="btn-primary text-xs"
              title="Pull latest output from chat and save"
            >
              <Save size={13} />
              Save as Diagnosis
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/90 hover:bg-white flex items-center justify-center border"
              style={{ borderColor: "rgba(227, 237, 232, 0.9)" }}
              title="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Iframe body */}
        <div className="flex-1 relative bg-bg">
          {!iframeReady && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-fg-subtle gap-2 pointer-events-none">
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
              <p className="text-xs">Loading MedReasoner chat…</p>
              <p className="text-[10px] opacity-70">
                If this hangs, make sure the chat app is running at{" "}
                <span className="font-mono">{MEDREASONER_UI}</span>
              </p>
            </div>
          )}
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={iframeSrc}
            title="MedReasoner Chat"
            className="w-full h-full border-0 bg-white"
            allow="clipboard-read; clipboard-write"
            // Sandbox is intentionally permissive enough to let the chat run
            // its own scripts and talk to its own backend. Adjust if needed.
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
            onLoad={() => {
              // Fallback: if the chat app doesn't post a "ready" message,
              // assume it's loaded after onLoad fires and try to init anyway.
              if (!iframeReady) {
                let chatOrigin;
                try {
                  chatOrigin = new URL(MEDREASONER_UI).origin;
                } catch {
                  chatOrigin = "*";
                }
                iframeRef.current?.contentWindow?.postMessage(
                  {
                    source: "hms",
                    type: "init",
                    case: casePayload,
                    sessionId: initialSessionId || "",
                    auth: {
                      type: "hms_access_token",
                      access_token: hmsAccessToken,
                    },
                    ui: {
                      autorun: true,
                      prefill_message: suggestedPrompt,
                    },
                  },
                  chatOrigin
                );
                // Mark as visible after a short grace period so the spinner clears.
                setTimeout(() => setIframeReady(true), 400);
              }
            }}
          />
        </div>

        {/* Footer disclaimer */}
        <div className="px-4 py-2 border-t border-line bg-subtle/40 flex-shrink-0">
          <p className="text-[10px] text-fg-subtle text-center">
            CliniqReason is an AI tool. Always apply independent clinical judgment.
          </p>
        </div>
      </div>
    </div>
  );
}

export { MEDREASONER_UI };
