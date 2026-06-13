import { useState } from "react";
import { C, PERSONAS, LANGUAGES } from "../AppNew";
import { TierConfig } from "../config/tierConfig";

const S = {
  sidebar: "#1A1610",
  sidebarBorder: "#2E2820",
  sidebarText: "#C4B89A",
  sidebarActive: "#FF8C00",
  sidebarActiveBg: "rgba(255,140,0,0.10)",
  sidebarHover: "rgba(255,255,255,0.04)",
  header: "#FFFFFF",
  headerBorder: "#EDE8DF",
  chatBg: "#FAF8F5",
  inputBg: "#FFFFFF",
  inputBorder: "#E5DFD6",
  inputFocus: "#FF8C00",
  userBubble: "#FF8C00",
  userBubbleText: "#FFFFFF",
  aiBubble: "#FFFFFF",
  aiBubbleText: "#1A1610",
  aiBubbleBorder: "#EDE8DF",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
};

interface StarterLayoutProps {
  tier: TierConfig;
  pdfsUploadedToday: number;
  onLogout: () => void;
  onNavigate?: (page: "terms" | "privacy") => void;
  onUpgrade?: () => void;
}

const NAV_ITEMS = [
  { id: "documents", icon: "📄", label: "Documents" },
  { id: "chats",     icon: "💬", label: "Recent Chats" },
  { id: "exports",   icon: "📤", label: "Exports" },
  { id: "settings",  icon: "⚙️", label: "Settings" },
];

const MOCK_CHATS = [
  { id: 1,  title: "Cell Biology Summary",     time: "2h ago"     },
  { id: 2,  title: "Important Equations",       time: "Yesterday"  },
  { id: 3,  title: "Blood Report Explanation",  time: "2 days ago" },
  { id: 4,  title: "Case Law Notes",            time: "3 days ago" },
  { id: 5,  title: "Physics Revision",          time: "4 days ago" },
  { id: 6,  title: "Contract Analysis",         time: "5 days ago" },
  { id: 7,  title: "Research Paper Summary",    time: "6 days ago" },
  { id: 8,  title: "Medical Report Review",     time: "7 days ago" },
  { id: 9,  title: "Study Notes — Chapter 4",   time: "8 days ago" },
  { id: 10, title: "Exam Prep Questions",       time: "9 days ago" },
];

const MOCK_MESSAGES = [
  { role: "user", text: "Summarize chapter 3 of the biology notes." },
  {
    role: "ai",
    sections: [
      { heading: "Summary",          body: "Chapter 3 covers cell division, focusing on mitosis and meiosis. The key difference is that mitosis produces identical daughter cells, while meiosis produces genetically unique gametes." },
      { heading: "Key Concepts",     body: "Mitosis (4 phases: Prophase, Metaphase, Anaphase, Telophase) · Meiosis I & II · Chromosome number halving · Crossing over in Prophase I" },
      { heading: "Important Points", body: "Errors in meiosis can lead to aneuploidy (e.g., Down syndrome). Mitosis is used for growth and repair; meiosis for sexual reproduction only." },
    ],
  },
];

type View = "home" | "chat";

export default function StarterLayout({
  tier, pdfsUploadedToday, onLogout, onNavigate, onUpgrade,
}: StarterLayoutProps) {
  const [view, setView]                   = useState<View>("chat"); // "home" = landing, "chat" = active chat
  const [activeNav, setActiveNav]         = useState("documents");
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [inputValue, setInputValue]       = useState("");
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0].id);
  const [selectedLang, setSelectedLang]   = useState("English");
  const [activeChat, setActiveChat]       = useState<number | null>(1);
  const isMobile = window.innerWidth < 768;

  const pdfsRemaining = tier.pdfsPerDay === -1 ? null : tier.pdfsPerDay - pdfsUploadedToday;

  const handleNewChat = () => {
    setView("home");
    setActiveChat(null);
    setInputValue("");
    if (isMobile) setSidebarOpen(false);
  };

  const handleSelectChat = (id: number) => {
    setActiveChat(id);
    setView("chat");
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      fontFamily: "'Montserrat', sans-serif",
      background: S.chatBg,
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .nav-item { transition: background 0.15s; cursor: pointer; border-radius: 8px; }
        .nav-item:hover { background: ${S.sidebarHover} !important; }
        .send-btn { transition: opacity 0.15s, transform 0.15s; }
        .send-btn:hover { opacity: 0.88; transform: scale(1.04); }
        .chat-input:focus { outline: none; border-color: ${S.inputFocus} !important; box-shadow: 0 0 0 3px rgba(255,140,0,0.10) !important; }
        .new-chat-btn:hover { opacity: 0.88; }
        .chat-item:hover { background: rgba(255,255,255,0.06) !important; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 4px; }
      `}</style>

      {/* ── Mobile overlay ── */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "rgba(0,0,0,0.5)", animation: "fadeIn 0.2s ease",
        }} />
      )}

      {/* ════════════════════════════════
          SIDEBAR
      ════════════════════════════════ */}
      <div style={{
        width: 240, background: S.sidebar,
        display: "flex", flexDirection: "column", flexShrink: 0,
        borderRight: `1px solid ${S.sidebarBorder}`, zIndex: 50,
        ...(isMobile ? {
          position: "fixed", top: 0, left: 0, bottom: 0,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
        } : {}),
      }}>

        {/* Logo */}
        <div style={{
          padding: "16px 16px 12px",
          borderBottom: `1px solid ${S.sidebarBorder}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <button
            onClick={handleNewChat}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
          >
            <img src="/header-logo.png" alt="PageWise"
              style={{ height: 30, width: "auto", objectFit: "contain", filter: "brightness(1.1)", display: "block" }} />
          </button>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{
              background: "none", border: "none", color: S.sidebarText,
              fontSize: 18, cursor: "pointer", padding: 4,
            }}>✕</button>
          )}
        </div>

        {/* ── New Chat Button ── */}
        <div style={{ padding: "12px 12px 4px" }}>
          <button
            className="new-chat-btn"
            onClick={handleNewChat}
            style={{
              width: "100%",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              background: "rgba(255,140,0,0.12)",
              border: `1px solid rgba(255,140,0,0.25)`,
              borderRadius: 10, padding: "9px 0",
              color: S.sidebarActive, fontSize: 12, fontWeight: 700,
              cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
              letterSpacing: 0.3, transition: "opacity 0.15s",
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span> New Chat
          </button>
        </div>

        {/* Nav Items */}
        <nav style={{ padding: "8px 10px", flex: 1, overflowY: "auto" }}>
          {NAV_ITEMS.map(item => (
            <div key={item.id} className="nav-item"
              onClick={() => { setActiveNav(item.id); if (isMobile) setSidebarOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", marginBottom: 2,
                background: activeNav === item.id ? S.sidebarActiveBg : "transparent",
                borderLeft: activeNav === item.id ? `2px solid ${S.sidebarActive}` : "2px solid transparent",
              }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              <span style={{
                fontSize: 13, fontWeight: activeNav === item.id ? 700 : 500,
                color: activeNav === item.id ? S.sidebarActive : S.sidebarText,
              }}>{item.label}</span>
              {item.id === "chats" && (
                <span style={{
                  marginLeft: "auto", fontSize: 10, fontWeight: 700,
                  background: "rgba(255,140,0,0.15)", color: S.sidebarActive,
                  padding: "1px 6px", borderRadius: 10,
                }}>10</span>
              )}
            </div>
          ))}

          {/* Recent Chats list */}
          {activeNav === "chats" && (
            <div style={{ marginTop: 6 }}>
              {MOCK_CHATS.map(chat => (
                <div
                  key={chat.id}
                  className="chat-item"
                  onClick={() => handleSelectChat(chat.id)}
                  style={{
                    padding: "8px 12px", borderRadius: 8, marginBottom: 2,
                    cursor: "pointer",
                    background: activeChat === chat.id ? "rgba(255,140,0,0.08)" : "transparent",
                    borderLeft: activeChat === chat.id ? `2px solid ${S.sidebarActive}` : "2px solid transparent",
                    transition: "background 0.15s",
                  }}
                >
                  <div style={{
                    fontSize: 12, fontWeight: activeChat === chat.id ? 700 : 500,
                    color: activeChat === chat.id ? S.sidebarActive : S.sidebarText,
                    marginBottom: 2, whiteSpace: "nowrap",
                    overflow: "hidden", textOverflow: "ellipsis",
                  }}>{chat.title}</div>
                  <div style={{ fontSize: 10, color: "#665E52" }}>{chat.time}</div>
                </div>
              ))}

              {/* Retention notice */}
              <div style={{
                margin: "10px 4px 0", padding: "8px 10px",
                background: "rgba(255,140,0,0.06)",
                border: "1px solid rgba(255,140,0,0.12)",
                borderRadius: 8, fontSize: 10, color: "#998877", lineHeight: 1.6,
              }}>
                10 chats · 14-day retention<br />
                <span onClick={onUpgrade}
                  style={{ color: S.sidebarActive, fontWeight: 700, cursor: "pointer" }}>
                  Upgrade to Pro for unlimited →
                </span>
              </div>
            </div>
          )}
        </nav>

        {/* Upgrade + Logout */}
        <div style={{ padding: "12px 12px", borderTop: `1px solid ${S.sidebarBorder}` }}>
          <button onClick={onUpgrade} style={{
            width: "100%",
            background: "linear-gradient(135deg, #FF8C00 0%, #E67300 100%)",
            border: "none", borderRadius: 10, padding: "10px 0",
            color: "#fff", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
            letterSpacing: 0.3, boxShadow: "0 2px 8px rgba(255,140,0,0.30)",
            transition: "opacity 0.15s",
          }}>⚡ Upgrade to Pro</button>
          <div onClick={onLogout} style={{
            textAlign: "center", fontSize: 10, color: "#665E52",
            marginTop: 8, cursor: "pointer", fontWeight: 500,
          }}>Log out</div>
        </div>
      </div>

      {/* ════════════════════════════════
          MAIN AREA
      ════════════════════════════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Sticky Header ── */}
        <div style={{
          background: S.header, borderBottom: `1px solid ${S.headerBorder}`,
          padding: "0 20px", height: 56,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, boxShadow: S.shadow,
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} style={{
                background: "none", border: "none", fontSize: 20,
                cursor: "pointer", color: C.dark, padding: "4px 6px", borderRadius: 6,
              }}>☰</button>
            )}
            {view === "chat" && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>
                  {MOCK_CHATS.find(c => c.id === activeChat)?.title || "Biology Notes.pdf"}
                </div>
                <div style={{ fontSize: 10, color: C.textMid, fontWeight: 500 }}>
                  {pdfsRemaining !== null
                    ? `${pdfsUploadedToday} / ${tier.pdfsPerDay} PDFs today`
                    : "Unlimited PDFs"}
                </div>
              </div>
            )}
            {view === "home" && (
              <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>
                Start a new conversation
              </div>
            )}
          </div>

          {view === "chat" && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <select value={selectedLang} onChange={e => setSelectedLang(e.target.value)}
                style={{
                  background: C.bg, border: `1px solid ${S.inputBorder}`,
                  borderRadius: 8, padding: "5px 8px", fontSize: 11,
                  fontWeight: 600, color: C.dark,
                  fontFamily: "'Montserrat', sans-serif", cursor: "pointer",
                }}>
                {LANGUAGES.map(l => <option key={l}>{l}</option>)}
              </select>
              <select value={selectedPersona} onChange={e => setSelectedPersona(e.target.value)}
                style={{
                  background: C.bg, border: `1px solid ${S.inputBorder}`,
                  borderRadius: 8, padding: "5px 10px", fontSize: 11,
                  fontWeight: 600, color: C.dark,
                  fontFamily: "'Montserrat', sans-serif", cursor: "pointer",
                }}>
                {PERSONAS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <button style={{
                background: "transparent", border: `1px solid ${S.inputBorder}`,
                borderRadius: 8, padding: "5px 12px", fontSize: 11,
                fontWeight: 600, color: C.dark, cursor: "pointer",
                fontFamily: "'Montserrat', sans-serif",
              }}>📤 Export</button>
            </div>
          )}
        </div>

        {/* ── Home / Landing state ── */}
        {view === "home" && (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            padding: 32, animation: "fadeIn 0.2s ease",
          }}>
            <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <h2 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 26, color: C.dark, fontWeight: 700, marginBottom: 8,
              }}>Upload a PDF to start</h2>
              <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7, marginBottom: 24 }}>
                Drop any document and ask questions,<br />
                extract insights, or generate study notes.
              </p>
              <button
                onClick={() => setView("chat")} // TODO: trigger real file input
                style={{
                  background: C.orange, border: "none", borderRadius: 12,
                  padding: "13px 32px", color: "#fff", fontSize: 14,
                  fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Montserrat', sans-serif",
                  boxShadow: "0 4px 16px rgba(255,140,0,0.30)",
                }}>
                📎 Upload PDF
              </button>

              {/* Recent chats shortcut */}
              {MOCK_CHATS.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: C.muted,
                    letterSpacing: 1, marginBottom: 10, textTransform: "uppercase",
                  }}>Or continue a recent chat</div>
                  {MOCK_CHATS.slice(0, 3).map(chat => (
                    <div key={chat.id} onClick={() => handleSelectChat(chat.id)}
                      style={{
                        padding: "10px 14px", borderRadius: 10, marginBottom: 6,
                        background: "#fff", border: `1px solid ${S.inputBorder}`,
                        cursor: "pointer", textAlign: "left",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        transition: "border-color 0.15s",
                      }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.dark }}>
                        {chat.title}
                      </span>
                      <span style={{ fontSize: 10, color: C.muted }}>{chat.time}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Chat view ── */}
        {view === "chat" && (
          <>
            <div style={{
              flex: 1, overflowY: "auto", padding: "24px 20px",
              display: "flex", flexDirection: "column", gap: 16,
              maxWidth: 720, width: "100%", margin: "0 auto",
            }}>
              {MOCK_MESSAGES.map((msg, i) => (
                <div key={i} style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}>
                  {msg.role === "user" ? (
                    <div style={{
                      background: S.userBubble, color: S.userBubbleText,
                      borderRadius: "16px 16px 4px 16px",
                      padding: "10px 16px", fontSize: 13, fontWeight: 600,
                      maxWidth: "75%", boxShadow: "0 2px 8px rgba(255,140,0,0.20)",
                    }}>{msg.text}</div>
                  ) : (
                    <div style={{
                      background: S.aiBubble, border: `1px solid ${S.aiBubbleBorder}`,
                      borderRadius: "4px 16px 16px 16px",
                      padding: "14px 18px", maxWidth: "85%", boxShadow: S.shadow,
                    }}>
                      <div style={{
                        fontSize: 10, fontWeight: 700, color: C.orange,
                        letterSpacing: 1, marginBottom: 10, textTransform: "uppercase",
                      }}>PageWise</div>
                      {msg.sections?.map((section, j) => (
                        <div key={j} style={{ marginBottom: j < msg.sections!.length - 1 ? 12 : 0 }}>
                          <div style={{
                            fontSize: 11, fontWeight: 700, color: C.dark,
                            letterSpacing: 0.5, marginBottom: 4, textTransform: "uppercase",
                          }}>{section.heading}</div>
                          <div style={{
                            fontSize: 13, color: "#3D3530", lineHeight: 1.65,
                          }}>{section.body}</div>
                          {j < msg.sections!.length - 1 && (
                            <div style={{ height: 1, background: S.aiBubbleBorder, marginTop: 12 }} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── Sticky Input Bar ── */}
            <div style={{
              background: S.header, borderTop: `1px solid ${S.headerBorder}`,
              padding: "12px 20px", flexShrink: 0,
              position: "sticky", bottom: 0, zIndex: 10,
            }}>
              <div style={{
                maxWidth: 720, margin: "0 auto",
                display: "flex", gap: 8, alignItems: "flex-end",
              }}>
                <button onClick={() => setView("home")} title="Upload new PDF" style={{
                  background: "none", border: `1px solid ${S.inputBorder}`,
                  borderRadius: 10, padding: "10px 12px",
                  fontSize: 16, cursor: "pointer", color: C.textMid, flexShrink: 0,
                }}>📎</button>
                <textarea className="chat-input" value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder="Ask anything about your documents..."
                  rows={1} style={{
                    flex: 1, background: S.inputBg,
                    border: `1.5px solid ${S.inputBorder}`,
                    borderRadius: 12, padding: "10px 14px",
                    fontSize: 13, fontFamily: "'Montserrat', sans-serif",
                    color: C.dark, resize: "none", lineHeight: 1.5,
                    transition: "border-color 0.15s, box-shadow 0.15s",
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      setInputValue("");
                    }
                  }} />
                <button className="send-btn" style={{
                  background: inputValue.trim() ? C.orange : S.inputBorder,
                  border: "none", borderRadius: 10, padding: "10px 14px",
                  fontSize: 16, cursor: inputValue.trim() ? "pointer" : "default",
                  color: inputValue.trim() ? "#fff" : C.muted,
                  flexShrink: 0, transition: "background 0.15s",
                }}>➤</button>
              </div>
              <div style={{
                textAlign: "center", fontSize: 10, color: C.muted,
                marginTop: 8, fontWeight: 500,
              }}>
                AI responses may be inaccurate · Verify important information
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}