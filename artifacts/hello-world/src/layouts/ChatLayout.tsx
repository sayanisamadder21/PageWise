import { PERSONAS, SUGGESTIONS, ICONS } from "../AppWrapper";

function Icon({
  name,
  size = 14,
  color = "currentColor",
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#f59e0b",
            display: "inline-block",
            animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
          }}
        />
      ))}
    </span>
  );
}

interface ChatLayoutProps {
  pdfMeta: { pages: number; words: string } | null;
  messages: { role: string; text: string; ts: number }[];
  loading: boolean;
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
  fileRef: React.RefObject<HTMLInputElement| null>;
  bottomRef: React.RefObject<HTMLDivElement| null>;
  textareaRef: React.RefObject<HTMLTextAreaElement| null>;
  handleFile: (file: File) => void;
  onReset: () => void;
  currentP: (typeof PERSONAS)[0];
  fmt: (t: string) => string;
}

export default function ChatLayout({
  pdfMeta,
  messages,
  loading,
  persona,
  setPersona,
  input,
  setInput,
  send,
  copy,
  copied,
  showHints,
  smartQs,
  loadingQs,
  generateSmartQs,
  fileRef,
  bottomRef,
  textareaRef,
  handleFile,
  onReset,
  currentP,
  fmt,
}: ChatLayoutProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        overflow: "hidden",
        background: "#faf7f2",
        fontFamily: "Palatino Linotype, Georgia, serif",
      }}
    >
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .msg { animation: fadeUp 0.22s ease forwards; }
        .pill:hover { background:#fef3c7!important; border-color:#f59e0b!important; color:#92400e!important; }
        .send-btn:hover:not(:disabled) { background:#b45309!important; }
        .cp:hover { opacity:1!important; }
        .mode-btn:hover { background:#fef3c7!important; }
        ::-webkit-scrollbar { width:3px }
        ::-webkit-scrollbar-thumb { background:#d6c9a8; border-radius:2px }
        * { box-sizing:border-box; }
        textarea::placeholder { color:#c9b99a; font-style:italic; }
      `}</style>

      {/* FIXED HEADER */}
      <div
        style={{
          background: "#1c1208",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "2px solid #d97706",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              background: "#d97706",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: "#1c1208",
              fontWeight: "bold",
            }}
          >
            P
          </div>
          <div>
            <div style={{ fontSize: 18, color: "#fef3c7", fontWeight: 600 }}>
              PageWise
            </div>
            <div
              style={{
                fontSize: 9,
                color: "#78350f",
                letterSpacing: 3,
                textTransform: "uppercase",
                fontFamily: "monospace",
              }}
            >
              Chat with any PDF
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {pdfMeta && (
            <div
              style={{
                fontSize: 11,
                color: "#92400e",
                fontFamily: "monospace",
                background: "#2d1f0a",
                padding: "4px 10px",
                borderRadius: 6,
                border: "1px solid #3d2a10",
              }}
            >
              {pdfMeta.pages}pp / {pdfMeta.words}w
            </div>
          )}
          <button
            onClick={onReset}
            style={{
              background: "transparent",
              border: "1px solid #3d2a10",
              borderRadius: 6,
              padding: "4px 10px",
              color: "#78350f",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "monospace",
            }}
          >
            New PDF
          </button>
        </div>
      </div>

      {/* SCROLLABLE MESSAGES AREA */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "20px 20px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {messages.map((msg, i) => (
          <div
            key={i}
            className="msg"
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            {msg.role === "assistant" && (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: "#1c1208",
                  border: "1px solid #d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                <Icon name={currentP.icon} size={13} color="#d97706" />
              </div>
            )}
            <div style={{ maxWidth: "75%", position: "relative" }}>
              <div
                style={{
                  background: msg.role === "user" ? "#1c1208" : "#fff",
                  border:
                    msg.role === "user"
                      ? "1px solid #2d1f0a"
                      : "1px solid #e8dfc8",
                  borderRadius:
                    msg.role === "user"
                      ? "14px 4px 14px 14px"
                      : "4px 14px 14px 14px",
                  padding: "10px 14px",
                  fontSize: 14,
                  color: msg.role === "user" ? "#fef3c7" : "#2c1a05",
                  lineHeight: 1.75,
                }}
                dangerouslySetInnerHTML={{ __html: fmt(msg.text) }}
              />
              {msg.role === "assistant" && (
                <button
                  className="cp"
                  onClick={() => copy(msg.text, i)}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: -28,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: 12,
                    opacity: 0.3,
                    transition: "opacity 0.15s",
                    color: "#92400e",
                  }}
                >
                  {copied === i ? "ok" : "cp"}
                </button>
              )}
            </div>
            {msg.role === "user" && (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  color: "#1c1208",
                  fontWeight: "bold",
                  fontFamily: "monospace",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              >
                U
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div
            className="msg"
            style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 7,
                background: "#1c1208",
                border: "1px solid #d97706",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={currentP.icon} size={13} color="#d97706" />
            </div>
            <div
              style={{
                background: "#fff",
                border: "1px solid #e8dfc8",
                borderRadius: "4px 14px 14px 14px",
                padding: "12px 16px",
              }}
            >
              <Dots />
            </div>
          </div>
        )}

        {/* Suggestions */}
        {showHints && messages.length <= 1 && (
          <div className="msg">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  color: "#b45309",
                  letterSpacing: 3,
                  textTransform: "uppercase",
                  fontFamily: "monospace",
                }}
              >
                Try asking
              </div>
              <button
                onClick={generateSmartQs}
                disabled={loadingQs}
                style={{
                  background: loadingQs ? "#fef3c7" : "#1c1208",
                  border: "1px solid #d97706",
                  borderRadius: 20,
                  padding: "3px 10px",
                  fontSize: 10,
                  color: loadingQs ? "#92400e" : "#fbbf24",
                  cursor: loadingQs ? "not-allowed" : "pointer",
                  fontFamily: "monospace",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {loadingQs ? (
                  <span>
                    <Dots /> thinking
                  </span>
                ) : (
                  "* Ask for me"
                )}
              </button>
            </div>

            {smartQs.length === 0 && !loadingQs && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SUGGESTIONS.map((q, i) => (
                  <button
                    key={i}
                    className="pill"
                    onClick={() => send(q)}
                    style={{
                      background: "#fff",
                      border: "1px solid #e8dfc8",
                      borderRadius: 20,
                      padding: "5px 13px",
                      fontSize: 12,
                      color: "#78350f",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      fontFamily: "monospace",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}

            {smartQs.length > 0 && (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 6 }}
              >
                {smartQs.map((q, i) => (
                  <button
                    key={i}
                    className="pill"
                    onClick={() => send(q)}
                    style={{
                      background: "#fff",
                      border: "1px solid #d97706",
                      borderRadius: 10,
                      padding: "8px 14px",
                      fontSize: 13,
                      color: "#78350f",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      textAlign: "left",
                      lineHeight: 1.4,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        color: "#d97706",
                        fontFamily: "monospace",
                        fontSize: 11,
                        flexShrink: 0,
                        marginTop: 1,
                      }}
                    >
                      {i + 1}.
                    </span>
                    {q}
                  </button>
                ))}
                <button
                  onClick={generateSmartQs}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#b45309",
                    fontSize: 11,
                    cursor: "pointer",
                    fontFamily: "monospace",
                    textAlign: "left",
                    padding: "2px 0",
                    textDecoration: "underline",
                  }}
                >
                  refresh questions
                </button>
              </div>
            )}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* FIXED BOTTOM TOOLBAR */}
      <div
        style={{
          background: "#fff",
          borderTop: "1px solid #e8dfc8",
          padding: "10px 16px 14px",
          flexShrink: 0,
        }}
      >
        {/* Mode switcher */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 9,
              color: "#c9b99a",
              letterSpacing: 3,
              textTransform: "uppercase",
              fontFamily: "monospace",
              flexShrink: 0,
            }}
          >
            Mode
          </span>
          <div
            style={{
              display: "flex",
              gap: 4,
              flex: 1,
              flexWrap: "nowrap",
              overflowX: "auto",
            }}
          >
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                className="mode-btn"
                onClick={() => setPersona(p.id)}
                title={p.desc}
                style={{
                  flexShrink: 0,
                  background: persona === p.id ? "#1c1208" : "transparent",
                  border:
                    persona === p.id
                      ? "1px solid #d97706"
                      : "1px solid #e8dfc8",
                  borderRadius: 8,
                  padding: "5px 8px",
                  color: persona === p.id ? "#fbbf24" : "#92400e",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  fontFamily: "monospace",
                  fontSize: 11,
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Icon
                  name={p.icon}
                  size={11}
                  color={persona === p.id ? "#fbbf24" : "#92400e"}
                />
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input row */}
        <div
          style={{
            display: "flex",
            gap: 8,
            background: "#faf7f2",
            border: "1.5px solid #e8dfc8",
            borderRadius: 12,
            padding: "6px 8px 6px 14px",
            alignItems: "flex-end",
          }}
        >
          <button
            onClick={() => fileRef.current?.click()}
            title="Load new PDF"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
              marginBottom: 5,
              opacity: 0.5,
              transition: "opacity 0.15s",
              fontSize: 11,
              color: "#92400e",
              fontFamily: "monospace",
              fontWeight: "bold",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.5")}
          >
            PDF+
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) =>
              e.target.files && handleFile(e.target.files[0])
            }
          />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`Ask in ${currentP.label} mode...`}
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 14,
              color: "#1c1208",
              fontFamily: "Palatino, Georgia, serif",
              resize: "none",
              lineHeight: 1.6,
              paddingTop: 5,
              paddingBottom: 5,
              maxHeight: 90,
            }}
          />

          <button
            className="send-btn"
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              background: !input.trim() || loading ? "#e8dfc8" : "#d97706",
              border: "none",
              borderRadius: 9,
              width: 36,
              height: 36,
              cursor: !input.trim() || loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              transition: "all 0.15s",
              flexShrink: 0,
              color: !input.trim() || loading ? "#b45309" : "#fff",
              fontWeight: "bold",
            }}
          >
            ^
          </button>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 6,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "#d6c9a8",
              fontFamily: "monospace",
              letterSpacing: 1,
            }}
          >
            Enter to send | Shift+Enter new line
          </div>
          <div
            style={{
              fontSize: 9,
              color: "#b45309",
              fontFamily: "monospace",
            }}
          >
            Gemini 2.5 Flash
          </div>
        </div>
      </div>
    </div>
  );
}