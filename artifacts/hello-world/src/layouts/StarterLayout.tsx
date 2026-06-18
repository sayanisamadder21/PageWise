import { useState, useRef, useEffect } from "react";
import { C, PERSONAS, LANGUAGES, ICON_PATHS } from "../AppNew";
import { TierConfig, isFeatureUnlocked} from "../config/tierConfig";
import { Chat } from "../services/chatService";

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
  aiBubbleBorder: "#EDE8DF",
  shadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)",
  pillBg: "#F5F0E8",
  pillBorder: "#E5DFD6",
};

const SUGGESTIONS = [
  "Summarize in 3 bullet points",
  "What are the key takeaways?",
  "List all action items",
  "Extract all dates and deadlines",
  "Explain in simple language",
  "What problems does this solve?",
];

const AUTO_PROMPTS: Record<string, string> = {
  insights:   "Extract the key insights from this document",
  studynotes: "Generate comprehensive study notes from this document",
  examgen:    "Generate exam questions from this document",
  summarizer: "Give me a TL;DR summary in 5 bullet points",
};

function LockIcon({ size = 9, color ="currentColor"}: {size?: number; color?: string}) {
  return(
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y=" 11 " width=" 14" height=" 10" rx="2" />
      <path d=" M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    );
    }

// ── Auto-detect document type via Claude API ──
async function detectDocType(pdfText: string): Promise<string | null> {
  try {
    const snippet = pdfText.slice(0, 600);
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: `You are a document classifier. Based on the text excerpt below, classify the document into EXACTLY one of these categories and respond with ONLY that single word, nothing else:
- medical (health records, clinical notes, prescriptions, lab results, medical research)
- legal (contracts, agreements, court documents, legal briefs, terms, compliance)
- finance (financial reports, invoices, tax, accounting, investment)
- academic (research papers, textbooks, study materials, exam papers)
- general (anything else)

Text excerpt:
"""
${snippet}
"""

Reply with one word only.`,
        }],
      }),
    });
    const data = await res.json();
    const result = data?.content?.[0]?.text?.trim().toLowerCase();
    const PERSONA_MAP: Record<string, string> = {
      medical:  "medical",
      legal:    "lawyer",
      finance:  "analyst",
      academic: "studynotes",
    };
    return PERSONA_MAP[result] ?? null;
  } catch {
    return null;
  }
}

interface Message {
  role: string;
  text: string;
  ts: number;
  isSystem?: boolean;
  isLimit?: boolean;
}

interface StarterLayoutProps {
  tier: TierConfig;
  currentTier: "free" | "starter" | "pro";
  pdfsUploadedToday: number;
  questionsUsedToday: number;
  exportsUsedToday: number;
  pdfName: string;
  pdfText: string;
  pdfMeta: { pages: number; words: string } | null;
  messages: Message[];
  loading: boolean;
  streaming: boolean;
  input: string;
  setInput: (v: string) => void;
  persona: string;
  setPersona: (v: string) => void;
  language: string;
  setLanguage: (v: string) => void;
  handleFile: (file: File) => void;
  send: (text?: string) => void;
  onLogout: () => void;
  onUpgrade?: () => void;
  onNavigate?: (page: "terms" | "privacy") => void;
  onReset: () => void;
  fmt: (t: string) => string;
  onExportPdf?: (msgs: Message[], filename?: string) => void;
  // ── Chat history ──
  chatList: Chat[];
  onOpenChat: (chatId: string) => void;
  currentChatId: string | null;
  onDeleteChat: (chatId: string) => void;
}

const NAV_ITEMS = [
  { id: "documents", icon: "📄", label: "Documents"    },
  { id: "chats",     icon: "💬", label: "Recent Chats" },
  { id: "exports",   icon: "📤", label: "Exports"      },
  { id: "settings",  icon: "⚙️", label: "Settings"     },
];

type View = "home" | "chat" | "settings";

// ── Relative time helper ──
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "Just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

// ── SVG Icon ──
function Icon({ name, size = 11, color = "currentColor" }: { name: string; size?: number; color?: string }) {
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

function SettingsView({ onNavigate, onLogout, onUpgrade, tier }: {
  onNavigate?: (page: "terms" | "privacy") => void;
  onLogout: () => void;
  onUpgrade?: () => void;
  tier: TierConfig;
}) {
  const sections = [
    {
      title: "Account",
      items: [
        { label: "Plan",         value: tier.name,                                                    type: "info"   },
        { label: "Storage",      value: "Supabase",                                                   type: "info"   },
        { label: "Chat History", value: `${tier.chatHistoryLimit} chats · ${tier.chatHistoryRetentionDays} days`, type: "info" },
      ],
    },
    {
      title: "Billing",
      items: [
        { label: "Current Plan",    value: `${tier.name} — ₹${tier.monthlyPriceINR}/mo`, type: "info"   },
        { label: "Status",          value: "Payments launching soon",                     type: "info"   },
        { label: "Upgrade to Pro",  value: "",                                            type: "action", action: onUpgrade, color: C.orange },
      ],
    },
    {
      title: "Legal",
      items: [
        { label: "Terms & Conditions", value: "", type: "action", action: () => onNavigate?.("terms")    },
        { label: "Privacy Policy",     value: "", type: "action", action: () => onNavigate?.("privacy")  },
      ],
    },
    {
      title: "Account Actions",
      items: [
        { label: "Log out",        value: "", type: "action", action: onLogout,  color: C.textMid  },
        { label: "Delete Account", value: "", type: "action", action: () => {},  color: "#CC0000"  },
      ],
    },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px", maxWidth: 520, width: "100%", margin: "0 auto" }}>
      <h2 style={{
        fontSize: 20, fontWeight: 700, color: C.dark,
        fontFamily: "'Playfair Display', Georgia, serif",
        marginBottom: 24, marginTop: 0,
      }}>Settings</h2>
      {sections.map(section => (
        <div key={section.title} style={{ marginBottom: 24 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: C.muted,
            letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8,
          }}>{section.title}</div>
          <div style={{
            background: "#fff", borderRadius: 14,
            border: `1px solid ${S.inputBorder}`,
            overflow: "hidden", boxShadow: S.shadow,
          }}>
            {section.items.map((item, i) => (
              <div key={item.label}
                onClick={item.type === "action" ? (item.action as any) : undefined}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 16px",
                  borderBottom: i < section.items.length - 1 ? `1px solid ${S.inputBorder}` : "none",
                  cursor: item.type === "action" ? "pointer" : "default",
                }}
                onMouseEnter={e => { if (item.type === "action") (e.currentTarget as HTMLElement).style.background = S.pillBg; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: (item as any).color || (item.type === "action" ? C.orange : C.dark),
                  fontFamily: "'Montserrat', sans-serif",
                }}>{item.label}</span>
                {item.value
                  ? <span style={{ fontSize: 12, color: C.textMid, fontWeight: 500 }}>{item.value}</span>
                  : item.type === "action" ? <span style={{ fontSize: 14, color: C.muted }}>›</span>
                  : null}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ textAlign: "center", fontSize: 11, color: C.muted, marginTop: 8 }}>
        PageWise by Saevora · v1.0
      </div>
    </div>
  );
}

export default function StarterLayout({
  tier, currentTier, pdfsUploadedToday, questionsUsedToday, exportsUsedToday,
  pdfName, pdfText, pdfMeta, messages, loading, streaming,
  input, setInput, persona, setPersona, language, setLanguage,
  handleFile, send, onLogout, onUpgrade, onNavigate, onReset, fmt,
  onExportPdf, chatList, onOpenChat, currentChatId, onDeleteChat
}: StarterLayoutProps) {
  const [view, setView]               = useState<View>(pdfText ? "chat" : "home");
  const [activeNav, setActiveNav]     = useState("documents");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showChats, setShowChats]     = useState(true);
  const [copied, setCopied]           = useState<number | null>(null);
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [contextMenuChatId, setContextMenuChatId] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [detecting, setDetecting] = useState(false);

  const pdfsRemaining = tier.pdfsPerDay === -1 ? null : tier.pdfsPerDay - pdfsUploadedToday;

  useEffect(() => {
    if (pdfText) {
      setView("chat");
      if (!isFeatureUnlocked(currentTier, "default")) {
        setPersona("analyst");
        setDetecting(false);
        return;
      }
      // Reset to "default" mode first, then auto-detect
      setPersona("default");
      setDetecting(true);
      detectDocType(pdfText).then(detectedPersona => {
        if (detectedPersona) setPersona(detectedPersona);
        setDetecting(false);
      });
    }
  }, [pdfText, currentTier]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleNewChat = () => {
    onReset();
    setView("home");
    if (isMobile) setSidebarOpen(false);
  };

  const handleSelectChat = (chatId: string) => {
    onOpenChat(chatId);
    setView("chat");
    if (isMobile) setSidebarOpen(false);
  };

  const handleNavClick = (id: string) => {
    setActiveNav(id);
    if (id === "settings") setView("settings");
    else if (view === "settings") setView(pdfText ? "chat" : "home");
  };

  const handleFileWithLimit = (file: File) => {
    if (!file) return;
    if (tier.pdfsPerDay !== -1 && pdfsUploadedToday >= tier.pdfsPerDay) return;
    handleFile(file);
  };

  const handleModeClick = (personaId: string) => {
    setPersona(personaId);
    if (AUTO_PROMPTS[personaId] && pdfText) {
      send(AUTO_PROMPTS[personaId]);
    }
  };

  const LimitMessage = ({ type }: { type: "pdfs" | "questions" | "exports" }) => {
    const msgs = {
      pdfs:      { emoji: "📄", text: `You've used all ${tier.pdfsPerDay} PDFs for today.` },
      questions: { emoji: "💬", text: `You've used all ${tier.dailyQuestions} questions for today.` },
      exports:   { emoji: "📤", text: `You've used all ${tier.maxExportsPerDay} exports for today.` },
    };
    const m = msgs[type];
    return (
      <div style={{
        background: "#FFFBF0", border: `1px solid #FFE4A0`,
        borderRadius: 12, padding: "14px 16px", marginTop: 8,
        display: "flex", flexDirection: "column", gap: 6,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>{m.emoji} {m.text}</div>
        <div style={{ fontSize: 12, color: C.textMid }}>Your limit resets tomorrow at midnight.</div>
        {currentTier === "starter" && (
          <div onClick={onUpgrade} style={{ fontSize: 11, color: C.orange, fontWeight: 700, cursor: "pointer", marginTop: 2 }}>
            Go Pro for unlimited access →
          </div>
        )}
      </div>
    );
  };

  const atPdfLimit      = tier.pdfsPerDay      !== -1 && pdfsUploadedToday  >= tier.pdfsPerDay;
  const atQuestionLimit = tier.dailyQuestions   !== -1 && questionsUsedToday >= tier.dailyQuestions;
  const atExportLimit   = tier.maxExportsPerDay !== -1 && exportsUsedToday   >= tier.maxExportsPerDay;
  const isBusy          = loading || streaming;

  // Recent chats — max 3 for home screen preview
  const recentChats = chatList.slice(0, 3);

  return (
    <div style={{
      display: "flex", height: "100vh", overflow: "hidden",
      fontFamily: "'Montserrat', sans-serif", background: S.chatBg,
    }}>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .nav-item { transition:background 0.15s; cursor:pointer; border-radius:8px; }
        .nav-item:hover { background:${S.sidebarHover}!important; }
        .send-btn:hover:not(:disabled) { background:#CC6F00!important; }
        .chat-input:focus { outline:none; }
        .unified-input:focus-within { border-color:${S.inputFocus}!important; box-shadow:0 0 0 3px rgba(255,140,0,0.10)!important; }
        .pill-select { appearance:none; -webkit-appearance:none; cursor:pointer; }
        .pill-select:focus { outline:none; }
        .chat-item:hover { background:rgba(255,255,255,0.06)!important; }
        .mode-btn:hover:not(:disabled) { background:${S.pillBg}!important; border-color:${C.orange}!important; }
        .suggestion-pill:hover { border-color:${C.orange}!important; color:${C.dark}!important; }
        .pdf-plus-btn { opacity:0.5; transition:opacity 0.15s; }
        .pdf-plus-btn:hover { opacity:1; }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:4px; }
        ::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.10); border-radius:4px; }
        textarea { font-family:'Montserrat',sans-serif; }
        textarea::placeholder { color:#B8A99A; font-style:italic; }
        select { font-family:'Montserrat',sans-serif; }
        .page-cite {
          display:inline-flex; align-items:center;
          background:rgba(255,140,0,0.10); border:1px solid rgba(255,140,0,0.25);
          color:#CC6F00; border-radius:4px; padding:0px 5px;
          font-size:10px; font-weight:700; font-family:'Montserrat',sans-serif;
          letter-spacing:0.3px; margin:0 2px; vertical-align:middle;
          cursor:default; white-space:nowrap;
        }
      `}</style>

      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
        onChange={e => { if (e.target.files?.[0]) handleFileWithLimit(e.target.files[0]); e.target.value = ""; }} />

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: "fixed", inset: 0, zIndex: 40,
          background: "rgba(0,0,0,0.5)", animation: "fadeIn 0.2s ease",
        }} />
      )}

      {/* ════════ SIDEBAR ════════ */}
      <div onClick={e => e.stopPropagation()} style={{
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
          <button onClick={handleNewChat} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
            <img src="/header-logo.png" alt="PageWise"
              style={{ height: 30, objectFit: "contain", filter: "brightness(1.1)", display: "block" }} />
          </button>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} style={{
              background: "none", border: "none", color: S.sidebarText,
              fontSize: 18, cursor: "pointer", padding: 4,
            }}>✕</button>
          )}
        </div>

        {/* New Chat */}
        <div style={{ padding: "12px 12px 4px" }}>
          <button onClick={handleNewChat} style={{
            width: "100%",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
            background: "rgba(255,140,0,0.12)", border: `1px solid rgba(255,140,0,0.25)`,
            borderRadius: 10, padding: "9px 0",
            color: S.sidebarActive, fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
            letterSpacing: 0.3, transition: "opacity 0.15s",
          }}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>＋</span> New Chat
          </button>
        </div>

        {/* Nav */}
        <nav style={{ padding: "8px 10px", flex: 1, overflowY: "auto" }}>
          {NAV_ITEMS.map(item => (
            <div key={item.id} className="nav-item"
              onClick={() => {
                if (item.id === "chats") { setShowChats(prev => !prev); setActiveNav("chats"); }
                else { handleNavClick(item.id); }
              }}
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
              {item.id === "chats" && chatList.length > 0 && (
                <span style={{
                  marginLeft: "auto", fontSize: 10, fontWeight: 700,
                  background: "rgba(255,140,0,0.15)", color: S.sidebarActive,
                  padding: "1px 6px", borderRadius: 10,
                }}>{chatList.length}</span>
              )}
            </div>
          ))}

          {/* ── Real Chat History ── */}
          {showChats && (
            <div style={{ marginTop: 6 }}>
              {chatList.length === 0 ? (
                <div style={{
                  padding: "12px 12px", fontSize: 11,
                  color: "#665E52", fontStyle: "italic", lineHeight: 1.6,
                }}>
                  No chats yet. Upload a PDF and start asking questions!
                </div>
              ) : (
                chatList.map(chat => {
                  const isActive = currentChatId === chat.id;
                  const isMenu   = contextMenuChatId === chat.id;
                  return (
                    <div key={chat.id} style={{ position: "relative" }}>
                      <div className="chat-item"
                        onClick={() => {
                          if (isMenu) { setContextMenuChatId(null); return; }
                          handleSelectChat(chat.id);
                        }}
                        onMouseEnter={() => setHoveredChatId(chat.id)}
                        onMouseLeave={() => setHoveredChatId(null)}
                        onMouseDown={() => {
                          longPressTimer.current = setTimeout(() => {
                            setContextMenuChatId(chat.id);
                          }, 500);
                        }}
                        onMouseUp={() => {
                          if (longPressTimer.current) clearTimeout(longPressTimer.current);
                        }}
                        onTouchStart={() => {
                          longPressTimer.current = setTimeout(() => {
                            setContextMenuChatId(chat.id);
                          }, 500);
                        }}
                        onTouchEnd={() => {
                          if (longPressTimer.current) clearTimeout(longPressTimer.current);
                        }}
                        style={{
                          padding: "8px 12px", borderRadius: 8, marginBottom: 2, cursor: "pointer",
                          userSelect: "none",
                          background: isActive ? "rgba(255,140,0,0.08)" : "transparent",
                          borderLeft: isActive ? `2px solid ${S.sidebarActive}` : "2px solid transparent",
                          transition: "background 0.15s",
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                        {/* Title + time */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12, fontWeight: isActive ? 700 : 500,
                            color: isActive ? S.sidebarActive : S.sidebarText,
                            marginBottom: 2, whiteSpace: "nowrap",
                            overflow: "hidden", textOverflow: "ellipsis",
                          }}>{chat.title}</div>
                          <div style={{ fontSize: 10, color: "#665E52" }}>
                            {timeAgo(chat.last_accessed_at)}
                          </div>
                        </div>
                      </div>

                      {/* ── Context menu (long-press) ── */}
                      {isMenu && (
                        <>
                          <div
                            onClick={() => setContextMenuChatId(null)}
                            style={{ position: "fixed", inset: 0, zIndex: 90 }}
                          />
                          <div style={{
                            position: "absolute", left: 12, top: "100%",
                            zIndex: 100, minWidth: 140,
                            background: "#2A221A",
                            border: `1px solid ${S.sidebarBorder}`,
                            borderRadius: 10,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.40)",
                            overflow: "hidden",
                            animation: "fadeIn 0.12s ease",
                          }}>
                            <div
                              onClick={e => {
                                e.stopPropagation();
                                onDeleteChat(chat.id);
                                setContextMenuChatId(null);
                              }}
                              style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                                padding: "10px 14px", cursor: "pointer", fontSize: 12,
                                fontWeight: 600, color: "#FF5555",
                                fontFamily: "'Montserrat', sans-serif",
                                transition: "background 0.1s",
                              }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,60,60,0.10)"}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                            >
                              <span>Delete</span>
                              <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}

              {/* Usage footer */}
              <div style={{
                margin: "10px 4px 0", padding: "8px 10px",
                background: "rgba(255,140,0,0.06)", border: "1px solid rgba(255,140,0,0.12)",
                borderRadius: 8, fontSize: 10, color: "#998877", lineHeight: 1.6,
              }}>
                {chatList.length} / 10 chats · 14-day retention<br />
                <span onClick={onUpgrade} style={{ color: S.sidebarActive, fontWeight: 700, cursor: "pointer" }}>
                  Upgrade to Pro for unlimited →
                </span>
              </div>
            </div>
          )}
        </nav>

        {/* Upgrade + Logout */}
        <div style={{ padding: "12px", borderTop: `1px solid ${S.sidebarBorder}` }}>
          <button onClick={onUpgrade} style={{
            width: "100%",
            background: "linear-gradient(135deg, #FF8C00 0%, #E67300 100%)",
            border: "none", borderRadius: 10, padding: "10px 0",
            color: "#fff", fontSize: 12, fontWeight: 700,
            cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
            boxShadow: "0 2px 8px rgba(255,140,0,0.30)", transition: "opacity 0.15s",
          }}>⚡ Upgrade to Pro</button>
          <div onClick={onLogout} style={{
            textAlign: "center", fontSize: 10, color: "#665E52",
            marginTop: 8, cursor: "pointer", fontWeight: 500,
          }}>Log out</div>
        </div>
      </div>

      {/* ════════ MAIN AREA ════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* ── Header ── */}
        <div style={{
          background: S.header, borderBottom: `1px solid ${S.headerBorder}`,
          padding: "0 16px", height: 52,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0, boxShadow: S.shadow, zIndex: 10, position: "relative",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} style={{
                background: "none", border: "none", fontSize: 20,
                cursor: "pointer", color: C.dark, padding: 4,
              }}>☰</button>
            )}
            {view === "chat" && pdfName && (
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.dark, lineHeight: 1.2 }}>{pdfName}</div>
                <div style={{ fontSize: 10, color: C.textMid, fontWeight: 500 }}>
                  {pdfsRemaining !== null ? `${pdfsUploadedToday} / ${tier.pdfsPerDay} PDFs today` : "Unlimited PDFs"}
                </div>
              </div>
            )}
            {view === "home"     && <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>New Chat</div>}
            {view === "settings" && <div style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Settings</div>}
          </div>
          <div style={{ flexShrink: 0 }} />
        </div>

        {/* ── HOME view ── */}
        {view === "home" && (
          <div style={{
            flex: 1, overflowY: "auto",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 32, animation: "fadeIn 0.25s ease",
          }}>
            <div style={{ maxWidth: 400, width: "100%", textAlign: "center" }}>
              <img src="/header-logo.png" alt="PageWise"
                style={{ height: 44, objectFit: "contain", opacity: 0.85, display: "block", margin: "0 auto 20px" }} />
              <h2 style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 24, color: C.dark, fontWeight: 700, marginBottom: 8, marginTop: 0,
              }}>Upload a PDF to start</h2>
              <p style={{ fontSize: 13, color: C.textMid, lineHeight: 1.7, marginBottom: 24, marginTop: 0 }}>
                Drop any document and ask questions,<br />extract insights, or generate study notes.
              </p>

              {atPdfLimit ? (
                <LimitMessage type="pdfs" />
              ) : (
                <button onClick={() => fileRef.current?.click()} style={{
                  background: C.orange, border: "none", borderRadius: 50,
                  padding: "13px 36px", color: "#fff", fontSize: 14,
                  fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Montserrat', sans-serif",
                  boxShadow: "0 4px 16px rgba(255,140,0,0.30)",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}>📎 Upload PDF</button>
              )}

              {!atPdfLimit && tier.pdfsPerDay !== -1 && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 12, fontWeight: 500 }}>
                  {pdfsUploadedToday} / {tier.pdfsPerDay} PDFs used today
                </div>
              )}

              {/* ── Recent chats on home screen ── */}
              {recentChats.length > 0 && (
                <div style={{ marginTop: 32 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 700, color: C.muted,
                    letterSpacing: 1.5, marginBottom: 12, textTransform: "uppercase",
                  }}>Continue a recent chat</div>
                  {recentChats.map(chat => (
                    <div key={chat.id} onClick={() => handleSelectChat(chat.id)}
                      style={{
                        padding: "11px 16px", borderRadius: 12, marginBottom: 8,
                        background: "#fff", border: `1px solid ${S.inputBorder}`,
                        cursor: "pointer", textAlign: "left",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        boxShadow: S.shadow,
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = C.orange}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = S.inputBorder}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{chat.title}</span>
                      <span style={{ fontSize: 10, color: C.muted, marginLeft: 12, flexShrink: 0 }}>
                        {timeAgo(chat.last_accessed_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS view ── */}
        {view === "settings" && (
          <div style={{ flex: 1, overflowY: "auto", animation: "fadeIn 0.2s ease" }}>
            <SettingsView onNavigate={onNavigate} onLogout={onLogout} onUpgrade={onUpgrade} tier={tier} />
          </div>
        )}

        {/* ── CHAT view ── */}
        {view === "chat" && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
            {/* Lost PDF context guard */}
{!pdfText && (
  <div style={{
    flex: 1, display: "flex", alignItems: "center",
    justifyContent: "center", padding: 32,
  }}>
    <div style={{
      textAlign: "center", maxWidth: 320,
      background: "#fff", borderRadius: 16,
      border: `1px solid ${S.inputBorder}`,
      padding: "32px 24px", boxShadow: S.shadow,
    }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
      <div style={{
        fontSize: 15, fontWeight: 700, color: C.dark,
        marginBottom: 8, fontFamily: "'Playfair Display', Georgia, serif",
      }}>PDF context not available</div>
      <div style={{
        fontSize: 12, color: C.textMid, lineHeight: 1.7, marginBottom: 20,
      }}>
        The original PDF for this chat isn't loaded.<br />
        Re-upload it to continue asking questions.
      </div>
      <button onClick={() => fileRef.current?.click()} style={{
        background: C.orange, border: "none", borderRadius: 50,
        padding: "10px 28px", color: "#fff", fontSize: 13,
        fontWeight: 700, cursor: "pointer",
        fontFamily: "'Montserrat', sans-serif",
      }}>📎 Re-upload PDF</button>
    </div>
  </div>
)}

            {pdfText && (
            <>
            {/* Scrollable messages */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "20px 16px",
              display: "flex", flexDirection: "column", justifyContent:"flex-start",gap: 16,
              width: "100%", minHeight: 0,
            }}>
              <div style={{ maxWidth: 720, width: "100%", margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                    animation: "fadeIn 0.2s ease",
                  }}>
                    {msg.isSystem ? (
                      <div style={{
                        width: "100%", textAlign: "center",
                        fontSize: 11, color: C.textMid, fontWeight: 500, padding: "6px 0",
                      }}>{msg.text}</div>
                    ) : msg.isLimit ? (
                      <div style={{ maxWidth: "88%", width: "100%" }}>
                        <LimitMessage type={msg.text.includes("PDF") ? "pdfs" : msg.text.includes("export") ? "exports" : "questions"} />
                      </div>
                    ) : msg.role === "user" ? (
                      <div style={{
                        background: S.userBubble, color: S.userBubbleText,
                        borderRadius: "18px 18px 4px 18px",
                        padding: "11px 16px", fontSize: 13, fontWeight: 600,
                        maxWidth: "78%", boxShadow: "0 2px 8px rgba(255,140,0,0.20)",
                        lineHeight: 1.5,
                      }}>{msg.text}</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", maxWidth: "88%" }}>
                        <div style={{
                          background: S.aiBubble, border: `1px solid ${S.aiBubbleBorder}`,
                          borderRadius: "4px 18px 18px 18px",
                          padding: "14px 18px", width: "100%", boxShadow: S.shadow,
                        }}>
                          <div style={{
                            fontSize: 9, fontWeight: 700, color: C.orange,
                            letterSpacing: 1.5, marginBottom: 10, textTransform: "uppercase",
                          }}>PageWise</div>
                          <div
                            style={{ fontSize: 13, color: "#3D3530", lineHeight: 1.7 }}
                            dangerouslySetInnerHTML={{ __html:
                              fmt(msg.text).replace(
                                /\[(?:p\.|page\s*)(\d+(?:[-–]\d+)?)\]/gi,
                                (_: string, pg: string) => `<span class="page-cite">p.${pg}</span>`
                              )
                            }}
                          />
                        </div>
                        {/* Copy + Export buttons */}
                        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(msg.text);
                              setCopied(i);
                              setTimeout(() => setCopied(null), 1800);
                            }}
                            style={{
                              background: copied === i ? C.orange : S.aiBubble,
                              border: `1.5px solid ${C.orange}`,
                              borderRadius: 7, cursor: "pointer", padding: "4px 10px",
                              color: copied === i ? C.dark : C.orange,
                              display: "flex", alignItems: "center", gap: 5,
                              fontSize: 10, fontFamily: "'Montserrat', sans-serif", fontWeight: 700,
                              transition: "all 0.15s",
                            }}>
                            {copied === i ? "✓ Copied!" : (
                              <>
                                <svg width={11} height={11} viewBox="0 0 24 24" fill="none"
                                  stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                                Copy
                              </>
                            )}
                          </button>
                          <button
                            disabled={atExportLimit}
                            onClick={() => {
                              if (atExportLimit) return;
                              const questionText = messages[i - 1]?.text || "answer";
                              const slug = questionText
                                .toLowerCase()
                                .replace(/[^a-z0-9 ]/g, "")
                                .trim()
                                .split(" ")
                                .slice(0, 4)
                                .join("-");
                              onExportPdf?.(
                                [
                                  ...(messages[i - 1]?.role === "user" ? [{ role: "user", text: messages[i - 1].text, ts: messages[i-1].ts }] : []),
                                  { role: "assistant", text: msg.text, ts: msg.ts },
                                ],
                                `pagewise-${slug}.pdf`,
                              );
                            }}
                            style={{
                              background: "transparent",
                              border: `1.5px solid ${atExportLimit ? S.pillBorder : C.orange}`,
                              borderRadius: 7, cursor: atExportLimit ? "not-allowed" : "pointer",
                              padding: "4px 10px",
                              color: atExportLimit ? C.muted : C.orange,
                              display: "flex", alignItems: "center", gap: 5,
                              fontSize: 10, fontFamily: "'Montserrat', sans-serif", fontWeight: 700,
                              transition: "all 0.15s",
                            }}>
                            📄 Export PDF
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {loading && (
                  <div style={{ display: "flex", justifyContent: "flex-start" }}>
                    <div style={{
                      background: S.aiBubble, border: `1px solid ${S.aiBubbleBorder}`,
                      borderRadius: "4px 18px 18px 18px",
                      padding: "14px 18px", boxShadow: S.shadow,
                    }}>
                      <Dots />
                    </div>
                  </div>
                )}

                {messages.length <= 1 && !loading && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{
                      fontSize: 10, fontWeight: 700, color: C.muted,
                      letterSpacing: 1.5, textTransform: "uppercase",
                    }}>Try asking</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {SUGGESTIONS.map((q, i) => (
                        <button key={i} className="suggestion-pill"
                          onClick={() => !isBusy && send(q)}
                          disabled={isBusy}
                          style={{
                            background: "#fff", border: `1px solid ${S.inputBorder}`,
                            borderRadius: 20, padding: "7px 14px",
                            fontSize: 12, color: C.textMid,
                            cursor: isBusy ? "not-allowed" : "pointer",
                            fontFamily: "'Montserrat', sans-serif", fontWeight: 500,
                            transition: "all 0.15s", opacity: isBusy ? 0.5 : 1,
                          }}>{q}</button>
                      ))}
                    </div>
                  </div>
                )}

                {atQuestionLimit && <LimitMessage type="questions" />}
                <div ref={bottomRef} />
              </div>
            </div>

            {/* ── Input Bar ── */}
            <div style={{
              background: S.header, borderTop: `1px solid ${S.headerBorder}`,
              padding: "10px 16px 14px", flexShrink: 0, zIndex: 10, position: "relative",
            }}>
              {/* MODE + LANG row */}
              <div style={{
                maxWidth: 720, margin: "0 auto 8px",
                display: "flex", alignItems: "center", gap: 6,
              }}>
                <span style={{
                  fontSize: 9, color: C.muted, letterSpacing: 3,
                  textTransform: "uppercase", fontWeight: 700, flexShrink: 0,
                }}>Mode</span>

                <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
                  <div style={{
                    position: "absolute", right: 0, top: 0, bottom: 0, width: 32,
                    zIndex: 2, pointerEvents: "none",
                    background: `linear-gradient(to right, transparent, ${S.header})`,
                  }} />
                  <div style={{ display: "flex", gap: 4, overflowX: "auto", flexWrap: "nowrap",
                    scrollbarWidth: "none", msOverflowStyle: "none" }}>
                    {/* ── No Mode button ── */}
                    {isFeatureUnlocked(currentTier,"default") && (
                    <button className="mode-btn"
                      onClick={() => !isBusy && setPersona("default")}
                      disabled={isBusy}
                      style={{
                        flexShrink: 0,
                        background: persona === "default" ? C.dark : "transparent",
                        border: `1px solid ${persona === "default" ? C.orange : S.pillBorder}`,
                        borderRadius: 8, padding: "5px 9px",
                        color: persona === "default" ? C.gold : C.textMid,
                        cursor: isBusy ? "not-allowed" : "pointer",
                        fontFamily: "'Montserrat', sans-serif",
                        fontSize: 11, fontWeight: 600,
                        display: "flex", alignItems: "center", gap: 4,
                        transition: "all 0.15s",
                        opacity: isBusy ? 0.5 : 1,
                        whiteSpace: "nowrap",
                      }}>
                      {detecting ? <Dots /> : "✦ Default"}
                    </button>
                    )}
                    {PERSONAS.map(p => {
                      const isLocked = currentTier === "free" && !isFeatureUnlocked(currentTier, p.id);
                      return (
                      <button key={p.id} className="mode-btn"
                        onClick={() => isLocked? onUpgrade?.() : handleModeClick(p.id)}
                        disabled={isBusy}
                        title= {isLocked ? "Upgrade to Starter to unlock this mode" : undefined}
                        style={{
                          flexShrink: 0,
                          background: persona === p.id ? C.dark : "transparent",
                          border: `1px solid ${persona === p.id ? C.orange : S.pillBorder}`,
                          borderRadius: 8, padding: "5px 9px",
                          color: persona === p.id ? C.gold : (isLocked ? C.muted : C.textMid),
                          cursor: isBusy ? "not-allowed" : "pointer",
                          fontFamily: "'Montserrat', sans-serif",
                          fontSize: 11, fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 4,
                          transition: "all 0.15s",
                          opacity: isBusy ? 0.5 : (isLocked ? 0.55 : 1),
                          whiteSpace: "nowrap",
                        }}>
                        <Icon name={p.icon} size={11} color={persona === p.id ? C.gold : (isLocked ? C.muted : C.textMid)} />
                        {p.label}
                        {isLocked && <LockIcon size ={9} color ={C.muted}/>}
                      </button>
                    );
                    })}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{
                    fontSize: 9, color: C.muted, letterSpacing: 2,
                    textTransform: "uppercase", fontWeight: 700,
                  }}>Lang</span>
                  <select value={language} onChange={e => setLanguage(e.target.value)}
                    className="pill-select"
                    style={{
                      background: S.chatBg, border: `1px solid ${S.pillBorder}`,
                      borderRadius: 7, padding: "4px 6px", fontSize: 11,
                      color: C.dark, cursor: "pointer", outline: "none",
                      maxWidth: 100, fontWeight: 500,
                    }}>
                    {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              {/* Unified input */}
              <div className="unified-input" style={{
                maxWidth: 720, margin: "0 auto",
                display: "flex", gap: 8, background: S.chatBg,
                border: `1.5px solid ${S.inputBorder}`,
                borderRadius: 12, padding: "6px 8px 6px 14px",
                alignItems: "flex-end",
                transition: "border-color 0.15s, box-shadow 0.15s",
              }}>
                <button
                  className="pdf-plus-btn"
                  onClick={() => !atPdfLimit && fileRef.current?.click()}
                  title={atPdfLimit ? "Daily PDF limit reached" : "Upload new PDF"}
                  style={{
                    background: "transparent", border: "none",
                    cursor: atPdfLimit ? "not-allowed" : "pointer",
                    padding: 0, flexShrink: 0, marginBottom: 5,
                    opacity: atPdfLimit ? 0.3 : 0.5,
                    fontSize: 11, color: C.textMid,
                    fontFamily: "'Montserrat', sans-serif", fontWeight: 700,
                  }}>PDF+</button>

                <textarea
                  className="chat-input"
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 90) + "px";
                  }}
                  placeholder={
                    atQuestionLimit
                      ? "Question limit reached for today..."
                      : detecting
                      ? "Detecting document type..."
                      : persona === "default"
                      ? "Ask anything about your document..."
                      : `Ask in ${PERSONAS.find(p => p.id === persona)?.label ?? "Analyst"} mode...`
                  }
                  disabled={atQuestionLimit}
                  rows={1}
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none",
                    fontSize: 14, color: C.dark, fontFamily: "'Montserrat', sans-serif",
                    resize: "none", lineHeight: 1.6,
                    paddingTop: 5, paddingBottom: 5, maxHeight: 90,
                  }}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey && !atQuestionLimit) {
                      e.preventDefault();
                      send(input);
                    }
                  }}
                />

                <button
                  className="send-btn"
                  onClick={() => !atQuestionLimit && send(input)}
                  disabled={atQuestionLimit || !input.trim() || loading || streaming}
                  style={{
                    background: input.trim() && !atQuestionLimit ? C.orange : C.muted,
                    border: "none", borderRadius: 9, width: 36, height: 36,
                    cursor: input.trim() && !atQuestionLimit ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, transition: "all 0.15s", flexShrink: 0,
                    color: input.trim() && !atQuestionLimit ? C.dark : "#8B6A3A",
                    fontWeight: "bold",
                  }}>^</button>
              </div>

              {/* Bottom hint row */}
              <div style={{
                maxWidth: 720, margin: "6px auto 0",
                display: "flex", justifyContent: "space-between",
              }}>
                <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, fontWeight: 600 }}>
                  Enter to send · Shift+Enter new line
                </div>
                <div style={{ fontSize: 9, color: C.orange, fontWeight: 700, letterSpacing: 1 }}>
                  GEMINI 2.5 FLASH
                </div>
              </div>
            </div>
            </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}