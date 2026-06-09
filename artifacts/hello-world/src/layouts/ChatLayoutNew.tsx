import { C, PERSONAS, SUGGESTIONS, ICON_PATHS, LANGUAGES } from "../AppNew";
import { exportPdf } from "../services/exportPdf";

function Icon({ name, size = 14, color = "currentColor" }: { name: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: C.gold,
          display: "inline-block",
          animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
        }} />
      ))}
    </span>
  );
}

interface ChatLayoutProps {
  pdfMeta: { pages: number; words: string } | null;
  messages: { role: string; text: string; ts: number }[];
  loading: boolean;
  streaming: boolean;
  persona: string;
  setPersona: (p: string) => void;
  input: string;
  setInput: (v: string) => void;
  send: (text?: string) => void;
  copy: (text: string, i: number) => void;
  copied: number | null;
  showHints: boolean;
  smartQs: string[];
  loadingQs: boolean;
  generateSmartQs: () => void;
  fileRef: React.RefObject<HTMLInputElement|null>;
  bottomRef: React.RefObject<HTMLDivElement|null>;
  textareaRef: React.RefObject<HTMLTextAreaElement|null>;
  handleFile: (file: File) => void;
  onReset: () => void;
  currentP: typeof PERSONAS[0];
  fmt: (t: string) => string;
  language: string;
  setLanguage: (l: string) => void;
  installPrompt: any;
  handleInstall: () => void;
  onLogout: () => void;
  pdfText: string;
  pdfName: string;
}

export default function ChatLayout({
  pdfMeta, messages, loading, streaming,
  persona, setPersona, input, setInput, send,
  copy, copied, showHints, smartQs, loadingQs,
  generateSmartQs, fileRef, bottomRef, textareaRef,
  handleFile, onReset, currentP, fmt,
  language, setLanguage, installPrompt, handleInstall, onLogout,
  pdfText, pdfName,
}: ChatLayoutProps) {

  const btnStyle = (active = false, disabled = false): React.CSSProperties => ({
    flexShrink: 0,
    background: active ? C.dark : "transparent",
    border: `1px solid ${active ? C.orange : C.border}`,
    borderRadius: 8, padding: "5px 9px",
    color: active ? C.gold : C.textMid,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.15s",
    fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 600,
    display: "flex", alignItems: "center", gap: 4,
    opacity: disabled ? 0.5 : 1,
  });
  const isMobile = window.innerWidth <= 640;
  const isSendDisabled = !input.trim() || loading || streaming;
  const isBusy = loading || streaming;

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      overflow: "hidden",
      background: C.bg,
      fontFamily: "'Montserrat', sans-serif",
    }}>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .msg { animation: fadeUp 0.22s ease forwards; }
        .pill:hover:not(:disabled) { background:${C.softBg}!important; border-color:${C.orange}!important; color:${C.dark}!important; }
        .send-btn:hover:not(:disabled) { background:#CC6F00!important; }
        .mode-btn:hover:not(:disabled) { background:${C.softBg}!important; }
        ::-webkit-scrollbar { width:3px }
        ::-webkit-scrollbar-thumb { background:${C.muted}; border-radius:2px }
        * { box-sizing:border-box; }
        textarea::placeholder { color:${C.muted}; font-style:italic; font-family:'Montserrat',sans-serif; }
        select { font-family:'Montserrat',sans-serif; }
      `}</style>

      {/* FIXED HEADER */}
      <div style={{
        background: C.dark, padding: "10px 18px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `2px solid ${C.orange}`, flexShrink: 0,
      }}>
        <img src="/header-logo.png" alt="PageWise"
          style={{ height: 40, width: "auto", display: "block", objectFit: "contain" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {pdfMeta && (
            <div style={{
              fontSize: 10, color: C.muted, fontFamily: "'Montserrat',sans-serif",
              background: "#2A1E10", padding: "3px 9px", borderRadius: 6,
              border: "1px solid #3A2810", fontWeight: 600,
            }}>
              {pdfMeta.pages}pp / {pdfMeta.words}w
            </div>
          )}
          <button onClick={onReset} style={{
            background: "transparent", border: "1px solid #3A2810",
            borderRadius: 6, padding: "4px 10px", color: "#8B6A3A",
            fontSize: 10, cursor: "pointer",
            fontFamily: "'Montserrat',sans-serif", fontWeight: 600,
          }}>New PDF</button>
          {installPrompt && (
            <button onClick={handleInstall} style={{
              background: C.orange, border: "none", borderRadius: 6,
              padding: "5px 11px", color: C.dark, fontSize: 10,
              cursor: "pointer", fontFamily: "'Montserrat',sans-serif",
              fontWeight: 700, whiteSpace: "nowrap",
            }}>📲 Install</button>
          )}
          {typeof navigator !== "undefined" && !!navigator.share && (
            <button onClick={() => navigator.share({ title: "PageWise", text: "Chat with any PDF using AI", url: window.location.href })}
              style={{
                background: C.orange, border: "none", borderRadius: 6,
                padding: "5px 11px", color: C.dark, fontSize: 10,
                cursor: "pointer", fontFamily: "'Montserrat',sans-serif",
                fontWeight: 700, whiteSpace: "nowrap",
              }}>🔗 Share</button>
          )}
          <a href="https://tally.so/r/yPzqV8" target="_blank" rel="noopener noreferrer"
            style={{
              background: C.orange, border: "none", borderRadius: 6,
              display: isMobile ? "none" : "inline-block",
              padding: "5px 11px", color: C.dark, fontSize: 10,
              cursor: "pointer", fontFamily: "'Montserrat',sans-serif",
              fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
            }}>🚀 Join Waitlist</a>
          <button onClick={onLogout} style={{
            background: "transparent", border: "1px solid #d97706",
            borderRadius: 6, padding: "5px 11px", color: C.orange,
            fontSize: 10, cursor: "pointer",
            fontFamily: "'Montserrat',sans-serif", fontWeight: 700, whiteSpace: "nowrap",
          }}>Log out</button>
        </div>
      </div>

      {/* SCROLLABLE MESSAGES AREA */}
      <div style={{
        flex: 1, overflowY: "auto",
        padding: "20px 20px 8px",
        display: "flex", flexDirection: "column", gap: 14,
      }}>
        {messages.map((msg, i) => (
          <div key={i} className="msg" style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
            gap: 8, alignItems: "flex-start",
          }}>
            {msg.role === "assistant" && (
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: C.dark, border: `1px solid ${C.orange}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, marginTop: 2,
              }}>
                <Icon name={currentP.icon} size={13} color={C.orange} />
              </div>
            )}
            <div style={{ maxWidth: "75%", display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={{
                background: msg.role === "user" ? C.dark : C.cardBg,
                border: `1px solid ${msg.role === "user" ? "#2A1E10" : C.border}`,
                borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                padding: "10px 14px", fontSize: 14,
                color: msg.role === "user" ? C.bg : C.dark,
                lineHeight: 1.75, fontFamily: "'Montserrat',sans-serif",
              }} dangerouslySetInnerHTML={{ __html: fmt(msg.text) }} />
              {msg.role === "assistant" && (
                <>
                  <button onClick={() => copy(msg.text, i)} style={{
                    marginTop: 5,
                    background: copied === i ? C.orange : C.cardBg,
                    border: `1.5px solid ${C.orange}`,
                    borderRadius: 7, cursor: "pointer", padding: "4px 10px",
                    color: copied === i ? C.dark : C.orange,
                    display: "flex", alignItems: "center", gap: 5,
                    fontSize: 10, fontFamily: "'Montserrat',sans-serif", fontWeight: 700,
                    transition: "all 0.15s",
                  }}>
                    {copied === i ? "✓ Copied!" : (
                      <>
                        <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                  <button onClick={() => {
                    const questionText = messages[i - 1]?.text || "answer";
                    const slug = questionText
                      .toLowerCase()
                      .replace(/[^a-z0-9 ]/g, "")
                      .trim()
                      .split(" ")
                      .slice(0, 4)
                      .join("-");
                    exportPdf(
                      [
                        ...(messages[i - 1]?.role === "user" ? [{ role: "user" as const, content: messages[i - 1].text }] : []),
                        { role: "assistant" as const, content: msg.text }
                      ],
                      `pagewise-${slug}.pdf`, {}
                    );
                  }} style={{
                    marginTop: 5,
                    background: "transparent",
                    border: `1.5px solid ${C.orange}`,
                    borderRadius: 7, cursor: "pointer", padding: "4px 10px",
                    color: C.orange, display: "flex", alignItems: "center", gap: 5,
                    fontSize: 10, fontFamily: "'Montserrat',sans-serif", fontWeight: 700,
                    transition: "all 0.15s",
                  }}>📄 Export PDF</button>
                </>
              )}
            </div>
            {msg.role === "user" && (
              <div style={{
                width: 28, height: 28, borderRadius: 7, background: C.orange,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, color: C.dark, fontWeight: 700, flexShrink: 0, marginTop: 2,
              }}>U</div>
            )}
          </div>
        ))}

        {loading && (
          <div className="msg" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7,
              background: C.dark, border: `1px solid ${C.orange}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name={currentP.icon} size={13} color={C.orange} />
            </div>
            <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: "4px 14px 14px 14px", padding: "12px 16px" }}>
              <Dots />
            </div>
          </div>
        )}

        {showHints && messages.length <= 1 && (
          <div className="msg">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ fontSize: 9, color: C.orange, letterSpacing: 3, textTransform: "uppercase", fontWeight: 700 }}>Try asking</div>
              <button onClick={generateSmartQs} disabled={loadingQs || isBusy} style={{
                background: loadingQs ? C.softBg : C.dark,
                border: `1px solid ${C.orange}`, borderRadius: 20,
                padding: "3px 10px", fontSize: 10,
                color: loadingQs ? C.textMid : C.gold,
                cursor: loadingQs || isBusy ? "not-allowed" : "pointer",
                fontFamily: "'Montserrat',sans-serif", fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 4,
                opacity: isBusy ? 0.5 : 1,
              }}>
                {loadingQs ? <span><Dots /> thinking</span> : "✦ Ask for me"}
              </button>
            </div>
            {smartQs.length === 0 && !loadingQs && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SUGGESTIONS.map((q, i) => (
                  <button key={i} className="pill" onClick={() => send(q)}
                    disabled={isBusy}
                    style={{
                      background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 20,
                      padding: "5px 13px", fontSize: 11, color: C.textMid,
                      cursor: isBusy ? "not-allowed" : "pointer",
                      transition: "all 0.15s", fontFamily: "'Montserrat',sans-serif", fontWeight: 500,
                      opacity: isBusy ? 0.5 : 1,
                    }}>{q}</button>
                ))}
              </div>
            )}
            {smartQs.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {smartQs.map((q, i) => (
                  <button key={i} className="pill" onClick={() => { send(q); }}
                    disabled={isBusy}
                    style={{
                      background: C.cardBg, border: `1px solid ${C.orange}`,
                      borderRadius: 10, padding: "8px 14px", fontSize: 13,
                      color: C.textMid,
                      cursor: isBusy ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                      textAlign: "left", lineHeight: 1.4,
                      display: "flex", alignItems: "flex-start", gap: 8,
                      fontFamily: "'Montserrat',sans-serif", fontWeight: 500,
                      opacity: isBusy ? 0.5 : 1,
                    }}>
                    <span style={{ color: C.orange, fontWeight: 700, fontSize: 11, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                    {q}
                  </button>
                ))}
                <button onClick={generateSmartQs} style={{
                  background: "transparent", border: "none", color: C.orange,
                  fontSize: 11, cursor: "pointer", textAlign: "left",
                  padding: "2px 0", textDecoration: "underline",
                  fontFamily: "'Montserrat',sans-serif", fontWeight: 600,
                }}>refresh questions</button>
              </div>
            )}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* FIXED BOTTOM TOOLBAR */}
      <div style={{
        background: C.cardBg,
        borderTop: `1px solid ${C.border}`,
        padding: "10px 16px 14px",
        flexShrink: 0,
      }}>
        {/* Mode + Language row */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 9, color: C.muted, letterSpacing: 3, textTransform: "uppercase", fontWeight: 700, flexShrink: 0 }}>Mode</span>
          <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
            <div style={{
              position: "absolute", right: 0, top: 0, bottom: 0, width: 40,
              zIndex: 2, pointerEvents: "none",
              background: `linear-gradient(to right, transparent, ${C.cardBg})`,
            }} />
            <div style={{ display: "flex", gap: 4, flexWrap: "nowrap", overflowX: "auto" }}>
              {PERSONAS.map(p => (
                <button key={p.id} className="mode-btn"
                  disabled={isBusy}
                  onClick={() => {
                    if (isBusy) return;
                    setPersona(p.id);
                    if (["insights", "studynotes", "examgen", "summarizer"].includes(p.id) && pdfText) {
                      const autoPrompts: Record<string, string> = {
                        insights: "Extract the key insights from this document",
                        studynotes: "Generate comprehensive study notes from this document",
                        examgen: "Generate exam questions from this document",
                        summarizer: "Give me a TL;DR summary of this document in 5 bullet points",
                      };
                      send(autoPrompts[p.id]);
                    }
                  }} title={p.desc} style={btnStyle(persona === p.id, isBusy)}>
                  <Icon name={p.icon} size={11} color={persona === p.id ? C.gold : C.textMid} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <span style={{ fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>Lang</span>
            <select value={language} onChange={e => setLanguage(e.target.value)} style={{
              background: C.bg, border: `1px solid ${C.border}`,
              borderRadius: 7, padding: "4px 6px", fontSize: 11,
              color: C.dark, cursor: "pointer", outline: "none",
              maxWidth: 100, fontWeight: 500,
            }}>
              {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Input row */}
        <div style={{
          display: "flex", gap: 8, background: C.bg,
          border: `1.5px solid ${C.border}`, borderRadius: 12,
          padding: "6px 8px 6px 14px", alignItems: "flex-end",
        }}>
          <button onClick={() => fileRef.current?.click()} title="Load new PDF"
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              padding: 0, flexShrink: 0, marginBottom: 5, opacity: 0.5,
              transition: "opacity 0.15s", fontSize: 11, color: C.textMid,
              fontFamily: "'Montserrat',sans-serif", fontWeight: 700,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "0.5"}
          >PDF+</button>
          <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
            onChange={e => e.target.files && handleFile(e.target.files[0])} />
          <textarea ref={textareaRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Ask in ${currentP.label} mode...`}
            rows={1}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 14, color: C.dark, fontFamily: "'Montserrat',sans-serif",
              resize: "none", lineHeight: 1.6, paddingTop: 5, paddingBottom: 5, maxHeight: 90,
            }}
          />
          <button className="send-btn" onClick={() => send()} disabled={isSendDisabled}
            style={{
              background: isSendDisabled ? C.muted : C.orange,
              border: "none", borderRadius: 9, width: 36, height: 36,
              cursor: isSendDisabled ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, transition: "all 0.15s", flexShrink: 0,
              color: isSendDisabled ? "#8B6A3A" : C.dark, fontWeight: "bold",
            }}>^</button>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, fontWeight: 600 }}>Enter to send  |  Shift+Enter new line</div>
          <div style={{ fontSize: 9, color: C.orange, fontWeight: 700, letterSpacing: 1 }}>GEMINI 2.5 FLASH</div>
        </div>
      </div>
    </div>
  );
}