import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../supabase";
import { QUERY_URL, C, PERSONAS, LANGUAGES, ICON_PATHS, SUGGESTIONS } from "../../../AppNew";
import { S } from "../ProLayout";

const AUTO_PROMPTS: Record<string, string> = {
  insights:   "Extract the key insights from this document",
  studynotes: "Generate comprehensive study notes from this document",
  examgen:    "Generate exam questions from this document",
  summarizer: "Give me a TL;DR summary in 5 bullet points",
};

function Icon({ name, size = 11, color = "currentColor" }: { name: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

interface WorkspaceDoc {
  id: string;
  name: string;
  extracted_text: string;
}

interface Message {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

interface ChatPanelProps {
  activeWorkspace: string;
}

const CITE_INSTRUCTION =
  "\nWhen making factual claims, cite the page using [p.X] inline. Only cite when confident; do not guess.";

function fmt(t: string): string {
  return t.split("\n").map(raw => {
    let line = raw
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
    if (/^##\s/.test(raw)) {
      const inner = line.replace(/^##\s+/, "");
      return `<div style="font-size:18px;font-weight:700;font-family:'Playfair Display',Georgia,serif;color:${C.dark};margin:10px 0 4px;line-height:1.3">${inner}</div>`;
    }
    if (/^###\s/.test(raw)) {
      const inner = line.replace(/^###\s+/, "");
      return `<div style="font-size:15px;font-weight:700;font-family:'Playfair Display',Georgia,serif;color:${C.dark};margin:8px 0 3px;line-height:1.3">${inner}</div>`;
    }
    if (/^[-*]\s/.test(raw)) {
      const inner = line.replace(/^[-*]\s+/, "");
      return `<div style="display:flex;gap:8px;margin:3px 0;padding-left:4px"><span style="color:${C.orange};font-weight:bold;flex-shrink:0;margin-top:1px">•</span><span>${inner}</span></div>`;
    }
    if (line.trim() === "") return `<div style="height:6px"></div>`;
    return `<span>${line}</span><br/>`;
  }).join("");
}

export default function ChatPanel({ activeWorkspace }: ChatPanelProps) {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [docs, setDocs]           = useState<WorkspaceDoc[]>([]);
  const [persona, setPersona]     = useState(PERSONAS[0].id);
  const [language, setLanguage]   = useState("English");
  const abortRef  = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isBusy = loading || streaming;

  useEffect(() => {
    if (activeWorkspace) fetchDocs();
  }, [activeWorkspace]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function fetchDocs(): Promise<WorkspaceDoc[]> {
    const { data } = await supabase
      .from("documents")
      .select("id, name, extracted_text")
      .eq("workspace_id", activeWorkspace);
    const fetched = data || [];
    setDocs(fetched);
    return fetched;
  }

  function revealWords(fullText: string) {
    const words = fullText.split(" ");
    let idx = 0;
    const ts = Date.now();
    setMessages(prev => [...prev, { role: "assistant", text: words[0] ?? fullText, ts }]);
    idx = 1;
    if (idx >= words.length) { setStreaming(false); return; }
    const timer = setInterval(() => {
      idx = Math.min(idx + 2, words.length);
      const revealed = words.slice(0, idx).join(" ");
      setMessages(prev => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i].role === "assistant" && next[i].ts === ts) {
            next[i] = { ...next[i], text: revealed };
            break;
          }
        }
        return next;
      });
      if (idx >= words.length) { clearInterval(timer); setStreaming(false); }
    }, 22);
  }

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || isBusy) return;

    const freshDocs = await fetchDocs();

    if (freshDocs.length === 0) {
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "⚠️ No documents in this workspace yet. Upload a PDF in the Document panel first.",
        ts: Date.now(),
      }]);
      return;
    }

    setInput("");
    setMessages(prev => [...prev, { role: "user", text: q, ts: Date.now() }]);
    setLoading(true);
    setStreaming(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    const combinedContext = freshDocs
      .map(doc => `--- Document: ${doc.name} ---\n${doc.extracted_text}`)
      .join("\n\n");

    const currentP = PERSONAS.find(p => p.id === persona);
    const systemInstruction = currentP ? currentP.sys + "\n\n" : "";
    const langInstruction = language !== "English" ? `Respond in ${language}.\n\n` : "";
    const fullPrompt = systemInstruction + langInstruction + CITE_INSTRUCTION
      + "\n\nDocument Content:\n" + combinedContext
      + "\n\nUser Question: " + q;

    try {
      const res = await fetch(QUERY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          generationConfig: {
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 1024,
          },
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errMsg: string = data?.error?.message || `API error ${res.status}`;
        const retryMatch = errMsg.match(/retry in ([\d.]+)s/i);
        const retryHint = retryMatch
          ? ` Please wait ${Math.ceil(parseFloat(retryMatch[1]))} seconds.` : "";
        const friendly = res.status === 429
          ? `⚠️ The AI service is temporarily rate-limited.${retryHint}`
          : `⚠️ AI error (${res.status}): ${errMsg.slice(0, 120)}`;
        setLoading(false);
        setStreaming(false);
        setMessages(prev => [...prev, { role: "assistant", text: friendly, ts: Date.now() }]);
        return;
      }

      const fullText: string =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
      setLoading(false);
      revealWords(fullText);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      setLoading(false);
      setStreaming(false);
      setMessages(prev => [...prev, {
        role: "assistant",
        text: "⚠️ Could not reach the AI service. Check your connection and try again.",
        ts: Date.now(),
      }]);
    }
  };

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: S.panelBg, overflow: "hidden",
    }}>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 16px 8px",
        display: "flex", flexDirection: "column", gap: 12,
      }}>
        {messages.length === 0 && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 8, padding: 24, textAlign: "center",
          }}>
            <div style={{ fontSize: 28 }}>💬</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.textDark }}>
              {docs.length === 0 ? "No documents yet" : "Ask anything"}
            </div>
            <div style={{ fontSize: 11, color: S.textMuted, lineHeight: 1.6, maxWidth: 220 }}>
              {docs.length === 0
                ? "Upload a PDF in the Document panel to start chatting."
                : `${docs.length} document${docs.length > 1 ? "s" : ""} loaded. Ask a question below.`}
            </div>

            {docs.length > 0 && !loading && (
              <div style={{ marginTop: 16, width: "100%", maxWidth: 320 }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: S.textMuted,
                  letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8,
                }}>Try asking</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                  {SUGGESTIONS.map((q, i) => (
                    <button key={i} onClick={() => !isBusy && send(q)} disabled={isBusy}
                      style={{
                        background: S.bg, border: `1px solid ${S.panelBorder}`,
                        borderRadius: 20, padding: "7px 14px",
                        fontSize: 11, color: S.textMid,
                        cursor: isBusy ? "not-allowed" : "pointer",
                        fontFamily: "'Montserrat', sans-serif", fontWeight: 500,
                        transition: "all 0.15s", opacity: isBusy ? 0.5 : 1,
                      }}>{q}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            animation: "fadeIn 0.2s ease",
          }}>
            {msg.role === "user" ? (
              <div style={{
                background: C.orange, color: "#fff",
                borderRadius: "14px 14px 4px 14px",
                padding: "9px 14px", fontSize: 13, fontWeight: 600,
                maxWidth: "78%", lineHeight: 1.5,
                boxShadow: "0 2px 8px rgba(255,140,0,0.20)",
              }}>{msg.text}</div>
            ) : (
              <div style={{
                background: S.bg, border: `1px solid ${S.panelBorder}`,
                borderRadius: "4px 14px 14px 14px",
                padding: "12px 16px", fontSize: 13, color: S.textDark,
                lineHeight: 1.7, maxWidth: "88%", boxShadow: S.shadow,
              }}>
                <div style={{
                  fontSize: 9, fontWeight: 700, color: C.orange,
                  letterSpacing: 1.5, marginBottom: 8, textTransform: "uppercase",
                }}>PageWise Pro</div>
                <div dangerouslySetInnerHTML={{ __html:
                  fmt(msg.text).replace(
                    /\[(?:p\.|page\s*)(\d+(?:[-–]\d+)?)\]/gi,
                    (_: string, pg: string) =>
                      `<span style="display:inline-flex;align-items:center;background:rgba(255,140,0,0.10);border:1px solid rgba(255,140,0,0.25);color:#CC6F00;border-radius:4px;padding:0 5px;font-size:10px;font-weight:700;font-family:'Montserrat',sans-serif;letter-spacing:0.3px;margin:0 2px;vertical-align:middle;white-space:nowrap">p.${pg}</span>`
                  )
                }} />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              background: S.bg, border: `1px solid ${S.panelBorder}`,
              borderRadius: "4px 14px 14px 14px",
              padding: "12px 16px", boxShadow: S.shadow,
            }}>
              <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                  <span key={i} style={{
                    width: 6, height: 6, borderRadius: "50%", background: C.orange,
                    display: "inline-block",
                    animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
                  }} />
                ))}
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={{
        background: S.panelBg, borderTop: `1px solid ${S.panelBorder}`,
        padding: "10px 14px 14px", flexShrink: 0,
      }}>
        {/* Mode + Lang row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{
            fontSize: 9, color: S.textMuted, letterSpacing: 3,
            textTransform: "uppercase", fontWeight: 700, flexShrink: 0,
          }}>Mode</span>
          <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
            <div style={{
              position: "absolute", right: 0, top: 0, bottom: 0, width: 28,
              zIndex: 2, pointerEvents: "none",
              background: `linear-gradient(to right, transparent, ${S.panelBg})`,
            }} />
            <div style={{
              display: "flex", gap: 4, overflowX: "auto", flexWrap: "nowrap",
              scrollbarWidth: "none", msOverflowStyle: "none",
            }}>
              {PERSONAS.map(p => (
                <button key={p.id} onClick={() => {
                  if (isBusy) return;
                  setPersona(p.id);
                  if (AUTO_PROMPTS[p.id] && docs.length > 0) send(AUTO_PROMPTS[p.id]);
                }} disabled={isBusy}
                  style={{
                    flexShrink: 0,
                    background: persona === p.id ? S.goldDim : "transparent",
                    border: `1px solid ${persona === p.id ? S.gold : S.panelBorder}`,
                    borderRadius: 8, padding: "5px 9px",
                    color: persona === p.id ? S.gold : S.textMid,
                    cursor: isBusy ? "not-allowed" : "pointer",
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 11, fontWeight: 600,
                    display: "flex", alignItems: "center", gap: 4,
                    transition: "all 0.15s",
                    opacity: isBusy ? 0.5 : 1, whiteSpace: "nowrap",
                  }}>
                  <Icon name={p.icon} size={11} color={persona === p.id ? S.gold : S.textMid} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <span style={{
              fontSize: 9, color: S.textMuted, letterSpacing: 2,
              textTransform: "uppercase", fontWeight: 700,
            }}>Lang</span>
            <select value={language} onChange={e => setLanguage(e.target.value)} disabled={isBusy}
              style={{
                background: S.bg, border: `1px solid ${S.panelBorder}`,
                borderRadius: 7, padding: "4px 7px",
                fontSize: 10, fontWeight: 600, color: S.textMid,
                fontFamily: "'Montserrat', sans-serif",
                cursor: "pointer", outline: "none",
                appearance: "none", WebkitAppearance: "none",
              }}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div style={{
          display: "flex", gap: 8, background: S.bg,
          border: `1.5px solid ${S.panelBorder}`, borderRadius: 12,
          padding: "6px 8px 6px 14px", alignItems: "flex-end",
        }}>
          <textarea
            value={input}
            onChange={e => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 90) + "px";
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder={docs.length === 0
              ? "Upload a document first…"
              : "Ask across all workspace documents…"}
            disabled={isBusy}
            rows={1}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 13, color: S.textDark, fontFamily: "'Montserrat', sans-serif",
              resize: "none", lineHeight: 1.6, paddingTop: 5, paddingBottom: 5,
              maxHeight: 90,
            }}
          />
          <button
            onClick={() => send()}
            disabled={isBusy || !input.trim()}
            style={{
              background: isBusy || !input.trim() ? S.textMuted : C.orange,
              border: "none", borderRadius: 9, width: 34, height: 34,
              cursor: isBusy || !input.trim() ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0, transition: "all 0.15s",
              color: isBusy || !input.trim() ? "#6B7280" : S.textDark,
              fontWeight: "bold",
            }}>^</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
          <div style={{ fontSize: 9, color: S.textMuted, letterSpacing: 1, fontWeight: 600 }}>
            Enter to send · Shift+Enter new line
          </div>
          <div style={{ fontSize: 9, color: C.orange, fontWeight: 700, letterSpacing: 1 }}>
            GEMINI 2.5 FLASH
          </div>
        </div>
      </div>
    </div>
  );
}
