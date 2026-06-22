import { useState, useEffect, useRef } from "react";
import { supabase } from "../../../supabase";
import { QUERY_URL, C, PERSONAS, LANGUAGES, ICON_PATHS, SUGGESTIONS } from "../../../AppNew";
import { S } from "../ProLayout";
import { createChat, loadChats, openChat, saveMessage, renameChat, starChat } from "../../../services/chatService";
import type { Chat } from "../../../services/chatService";

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

export interface Message {
  role: "user" | "assistant";
  text: string;
  ts: number;
}

interface ChatPanelProps {
  activeWorkspace: string;
  userId: string | null;
  onMessagesChange?: (messages: Message[]) => void;
}

const CITE_INSTRUCTION =
  "\nWhen making factual claims, cite the page using [p.X] inline. Only cite when confident; do not guess.";

interface CustomPersona {
  id: string;
  name: string;
  instruction: string;
}

const PERSONA_TEMPLATES: { id: string; name: string; instruction: string }[] = [
  { id: "research_reviewer", name: "Research Paper Reviewer", instruction: "Act as a peer reviewer for this research paper. Summarize the key findings, critically assess methodological limitations or gaps, and suggest promising directions for future research." },
  { id: "exec_briefing",     name: "Executive Briefing",       instruction: "Summarize this document for a senior executive with limited time. Lead with the decisions that need to be made, then key risks and opportunities — skip background detail unless it's essential to a decision." },
  { id: "meeting_prep",      name: "Meeting Prep Assistant",   instruction: "Prepare this document for an upcoming meeting. Extract action items and deadlines, surface open questions, and suggest a short list of discussion points." },
  { id: "compliance",        name: "Compliance Checker",       instruction: "Review this document for compliance requirements and obligations. Flag anything that appears missing, unclear, or inconsistent with standard compliance expectations." },
  { id: "content_repurpose", name: "Content Repurposer",       instruction: "Turn this document into reusable content: a blog post outline, a handful of LinkedIn post ideas, and a short newsletter summary." },
  { id: "marketing",         name: "Marketing Strategist",     instruction: "Analyze this document from a marketing perspective. Identify customer pain points it addresses, potential unique selling points, and marketing angles worth exploring." },
  { id: "blank",             name: "Start from scratch",       instruction: "" },
];

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

export default function ChatPanel({ activeWorkspace, userId, onMessagesChange }: ChatPanelProps) {
  const [messages, setMessages]               = useState<Message[]>([]);
  const [input, setInput]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [streaming, setStreaming]             = useState(false);
  const [docs, setDocs]                       = useState<WorkspaceDoc[]>([]);
  const [persona, setPersona]                 = useState(PERSONAS[0].id);
  const [language, setLanguage]               = useState("English");
  const [currentChatId, setCurrentChatId]     = useState<string | null>(null);
  const [chatInitialized, setChatInitialized] = useState(false);
  const [chatList, setChatList]               = useState<Chat[]>([]);
  const [currentChatTitle, setCurrentChatTitle] = useState("New Chat");
  const [showHistory, setShowHistory]         = useState(false);
  const [contextMenuChatId, setContextMenuChatId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition]       = useState<{ x: number; y: number } | null>(null);
  const [renamingChatId, setRenamingChatId]   = useState<string | null>(null);
  const [renameValue, setRenameValue]         = useState("");
  // Custom personas
  const [customPersonas, setCustomPersonas]   = useState<CustomPersona[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName]           = useState("");
  const [createInstruction, setCreateInstruction] = useState("");
  const [selectedTemplate, setSelectedTemplate]   = useState<string | null>(null);
  const [savingPersona, setSavingPersona]     = useState(false);
  const [personaMenuId, setPersonaMenuId]     = useState<string | null>(null);
  const [personaMenuPos, setPersonaMenuPos]   = useState<{ x: number; y: number } | null>(null);
  const [renamingPersonaId, setRenamingPersonaId] = useState<string | null>(null);
  const [renamePersonaValue, setRenamePersonaValue] = useState("");
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef  = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isBusy = loading || streaming;
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!activeWorkspace) return;
    setMessages([]);
    setCurrentChatId(null);
    setChatInitialized(false);
    setCurrentChatTitle("New Chat");
    setShowHistory(false);
    fetchDocs();
    if (userId) loadChats(userId, activeWorkspace).then(setChatList);
  }, [activeWorkspace, userId]);

  useEffect(() => {
    onMessagesChange?.(messages);
  }, [messages, onMessagesChange]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("custom_personas")
      .select("id, name, instruction")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .then(({ data }) => setCustomPersonas(data || []));
  }, [userId]);

  async function fetchDocs(): Promise<WorkspaceDoc[]> {
    const { data } = await supabase
      .from("documents")
      .select("id, name, extracted_text")
      .eq("workspace_id", activeWorkspace);
    const fetched = data || [];
    setDocs(fetched);
    return fetched;
  }

  async function handleOpenChat(chat: Chat) {
    setShowHistory(false);
    if (!userId) return;
    const restored = await openChat(chat.id, userId);
    if (!restored) return;
    const uiMessages: Message[] = restored.messages.map(m => ({
      role: m.role as "user" | "assistant",
      text: m.content,
      ts: new Date(m.created_at).getTime(),
    }));
    setMessages(uiMessages);
    setCurrentChatId(chat.id);
    setCurrentChatTitle(chat.title);
    setChatInitialized(true);
    setChatList(prev => [chat, ...prev.filter(c => c.id !== chat.id)]);
  }

  function startNewChat() {
    setMessages([]);
    setCurrentChatId(null);
    setChatInitialized(false);
    setCurrentChatTitle("New Chat");
    setShowHistory(false);
  }

  async function handleRenameChat(chatId: string, title: string) {
    if (!userId) return;
    const ok = await renameChat(chatId, userId, title);
    if (ok) {
      setChatList(prev => prev.map(c => c.id === chatId ? { ...c, title } : c));
      if (currentChatId === chatId) setCurrentChatTitle(title);
    }
  }

  async function handleStarChat(chatId: string) {
    if (!userId) return;
    const chat = chatList.find(c => c.id === chatId);
    if (!chat) return;
    const starred = !chat.starred;
    const ok = await starChat(chatId, userId, starred);
    if (ok) {
      setChatList(prev => {
        const updated = prev.map(c => c.id === chatId ? { ...c, starred } : c);
        return [...updated.filter(c => c.starred), ...updated.filter(c => !c.starred)];
      });
    }
  }

  async function handleSavePersona() {
    if (!userId || !createName.trim() || !createInstruction.trim()) return;
    setSavingPersona(true);
    const { data, error } = await supabase
      .from("custom_personas")
      .insert({ user_id: userId, name: createName.trim(), instruction: createInstruction.trim() })
      .select("id, name, instruction")
      .single();
    if (!error && data) {
      setCustomPersonas(prev => [...prev, data]);
      setPersona(data.id);
      setShowCreateModal(false);
      setCreateName("");
      setCreateInstruction("");
      setSelectedTemplate(null);
    }
    setSavingPersona(false);
  }

  async function handleDeletePersona(id: string) {
    if (!userId) return;
    await supabase.from("custom_personas").delete().eq("id", id).eq("user_id", userId);
    setCustomPersonas(prev => prev.filter(p => p.id !== id));
    if (persona === id) setPersona(PERSONAS[0].id);
  }

  async function handleRenamePersona(id: string, name: string) {
    if (!userId || !name.trim()) return;
    const { error } = await supabase
      .from("custom_personas")
      .update({ name: name.trim() })
      .eq("id", id)
      .eq("user_id", userId);
    if (!error) setCustomPersonas(prev => prev.map(p => p.id === id ? { ...p, name: name.trim() } : p));
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

    // Create chat row on first message
    let activeChatId = currentChatId;
    if (!chatInitialized && userId && activeWorkspace) {
      const title = q.length <= 60 ? q : q.slice(0, 57) + "…";
      const newChat = await createChat(userId, null, null, title, activeWorkspace);
      if (newChat) {
        activeChatId = newChat.id;
        setCurrentChatId(newChat.id);
        setCurrentChatTitle(newChat.title);
        setChatInitialized(true);
        setChatList(prev => [newChat, ...prev]);
      }
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

    const builtInP = PERSONAS.find(p => p.id === persona);
    const customP  = customPersonas.find(p => p.id === persona);
    const systemInstruction = ((builtInP?.sys ?? customP?.instruction) ?? "") + "\n\n";
    const langInstruction = language !== "English" ? `Respond in ${language}.\n\n` : "";
    const fullPrompt = CITE_INSTRUCTION
      + "\n\nDocument Content:\n" + combinedContext
      + "\n\nUser Question: " + q;

    try {
      const res = await fetch(QUERY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction + langInstruction }] },
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
      // Save both turns to DB (fire-and-forget — don't block the word reveal)
      if (activeChatId && userId) {
        saveMessage(activeChatId, userId, "user", q);
        saveMessage(activeChatId, userId, "assistant", fullText);
      }
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

      {/* Chat history bar */}
      <div style={{
        height: 44, display: "flex", alignItems: "center",
        padding: "0 12px", borderBottom: `1px solid ${S.panelBorder}`,
        background: S.panelBg, flexShrink: 0, position: "relative", gap: 8,
      }}>
        <button
          onClick={() => setShowHistory(v => !v)}
          style={{
            flex: 1, display: "flex", alignItems: "center", gap: 6, minWidth: 0,
            background: "none", border: "none", cursor: "pointer",
            padding: "4px 6px", borderRadius: 7, textAlign: "left",
          }}>
          <span style={{
            fontSize: 11, fontWeight: 600, color: S.textDark,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", flex: 1,
          }}>{currentChatTitle}</span>
          {chatList.length > 0 && (
            <span style={{
              background: S.goldDim, border: `1px solid rgba(255,140,0,0.3)`,
              borderRadius: 20, padding: "1px 7px",
              fontSize: 9, fontWeight: 700, color: S.gold, flexShrink: 0,
            }}>{chatList.length}</span>
          )}
          <span style={{ fontSize: 9, color: S.textMuted, flexShrink: 0 }}>
            {showHistory ? "▲" : "▼"}
          </span>
        </button>
        <button
          onClick={startNewChat}
          disabled={isBusy}
          style={{
            background: "none", border: `1px solid ${S.panelBorder}`,
            borderRadius: 7, padding: "4px 9px",
            fontSize: 10, fontWeight: 700, color: S.textMid,
            cursor: isBusy ? "not-allowed" : "pointer",
            fontFamily: "'Montserrat', sans-serif",
            flexShrink: 0, opacity: isBusy ? 0.5 : 1,
          }}>＋ New</button>

        {/* History dropdown */}
        {showHistory && (
          <div style={{
            position: "absolute", top: 44, left: 0, right: 0,
            background: S.panelBg, border: `1px solid ${S.panelBorder}`,
            borderTop: "none", zIndex: 50,
            maxHeight: 240, overflowY: "auto",
            boxShadow: S.shadow,
          }}>
            {chatList.length === 0 ? (
              <div style={{
                padding: "14px", fontSize: 11,
                color: S.textMuted, textAlign: "center",
              }}>No previous chats in this workspace</div>
            ) : chatList.map(chat => {
              const isActive   = chat.id === currentChatId;
              const isMenuOpen = contextMenuChatId === chat.id;
              const isRenaming = renamingChatId === chat.id;
              return (
                <div key={chat.id} style={{ position: "relative" }}>
                  {/* Inline rename */}
                  {isRenaming ? (
                    <div style={{ padding: "6px 10px", borderBottom: `1px solid ${S.panelBorder}` }}>
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            const t = renameValue.trim();
                            if (t) handleRenameChat(chat.id, t);
                            setRenamingChatId(null);
                          }
                          if (e.key === "Escape") setRenamingChatId(null);
                        }}
                        onBlur={() => {
                          const t = renameValue.trim();
                          if (t) handleRenameChat(chat.id, t);
                          setRenamingChatId(null);
                        }}
                        style={{
                          width: "100%", background: S.bg,
                          border: `1px solid ${S.gold}`,
                          borderRadius: 6, padding: "5px 8px",
                          color: S.textDark, fontSize: 11, outline: "none",
                          fontFamily: "'Montserrat', sans-serif",
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      onClick={() => {
                        if (isMenuOpen) { setContextMenuChatId(null); setMenuPosition(null); return; }
                        handleOpenChat(chat);
                      }}
                      onMouseDown={e => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        longPressTimer.current = setTimeout(() => {
                          setMenuPosition({ x: rect.left + 10, y: rect.bottom });
                          setContextMenuChatId(chat.id);
                        }, 500);
                      }}
                      onMouseUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                      onTouchStart={e => {
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                        longPressTimer.current = setTimeout(() => {
                          setMenuPosition({ x: rect.left + 10, y: rect.bottom });
                          setContextMenuChatId(chat.id);
                        }, 500);
                      }}
                      onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                      style={{
                        padding: "9px 14px", cursor: "pointer",
                        borderBottom: `1px solid ${S.panelBorder}`,
                        background: isActive ? S.goldDim : "transparent",
                        userSelect: "none", transition: "background 0.1s",
                        display: "flex", alignItems: "center", gap: 6,
                      }}
                      onMouseEnter={e => {
                        if (!isActive) (e.currentTarget as HTMLElement).style.background = S.bg;
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.background = isActive ? S.goldDim : "transparent";
                      }}>
                      {chat.starred && <span style={{ fontSize: 10, flexShrink: 0 }}>⭐</span>}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: 11, fontWeight: isActive ? 700 : 600, color: S.textDark,
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        }}>{chat.title}</div>
                        <div style={{ fontSize: 9, color: S.textMuted, marginTop: 2 }}>
                          {new Date(chat.last_accessed_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Context menu — rendered fixed so it escapes the scrollable list container */}
                  {isMenuOpen && menuPosition && (
                    <>
                      <div onClick={() => { setContextMenuChatId(null); setMenuPosition(null); }}
                        style={{ position: "fixed", inset: 0, zIndex: 90 }} />
                      <div style={{
                        position: "fixed",
                        left: menuPosition.x,
                        top: Math.min(menuPosition.y, window.innerHeight - 160),
                        zIndex: 100, minWidth: 150,
                        background: S.panelBg,
                        border: `1px solid ${S.panelBorder}`,
                        borderRadius: 10,
                        boxShadow: S.shadow,
                        overflow: "hidden",
                        animation: "fadeIn 0.12s ease",
                      }}>
                        {/* Pin / Unpin */}
                        <div
                          onClick={e => { e.stopPropagation(); handleStarChat(chat.id); setContextMenuChatId(null); setMenuPosition(null); }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                            padding: "10px 14px", cursor: "pointer", fontSize: 11,
                            fontWeight: 600, color: S.gold,
                            fontFamily: "'Montserrat', sans-serif", transition: "background 0.1s",
                            borderBottom: `1px solid ${S.panelBorder}`,
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = S.goldDim}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                          <span>{chat.starred ? "Unpin" : "Pin to top"}</span>
                          <span style={{ fontSize: 13 }}>{chat.starred ? "★" : "☆"}</span>
                        </div>
                        {/* Rename */}
                        <div
                          onClick={e => {
                            e.stopPropagation();
                            setRenameValue(chat.title);
                            setRenamingChatId(chat.id);
                            setContextMenuChatId(null);
                            setMenuPosition(null);
                          }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                            padding: "10px 14px", cursor: "pointer", fontSize: 11,
                            fontWeight: 600, color: S.textMid,
                            fontFamily: "'Montserrat', sans-serif", transition: "background 0.1s",
                            borderBottom: `1px solid ${S.panelBorder}`,
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = S.bg}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                          <span>Rename</span>
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </div>
                        {/* Delete */}
                        <div
                          onClick={e => {
                            e.stopPropagation();
                            if (!userId) return;
                            import("../../../services/chatService").then(({ deleteChat }) => {
                              deleteChat(chat.id, userId).then(ok => {
                                if (ok) {
                                  setChatList(prev => prev.filter(c => c.id !== chat.id));
                                  if (currentChatId === chat.id) startNewChat();
                                }
                              });
                            });
                            setContextMenuChatId(null);
                            setMenuPosition(null);
                          }}
                          style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                            padding: "10px 14px", cursor: "pointer", fontSize: 11,
                            fontWeight: 600, color: "#FF5555",
                            fontFamily: "'Montserrat', sans-serif", transition: "background 0.1s",
                          }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,60,60,0.08)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                          <span>Delete</span>
                          <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" /><path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

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
          <div style={{ position: "relative", flex: 1, overflow: isMobile ? "hidden" : "visible" }}>
            {isMobile && (
              <div style={{
                position: "absolute", right: 0, top: 0, bottom: 0, width: 28,
                zIndex: 2, pointerEvents: "none",
                background: `linear-gradient(to right, transparent, ${S.panelBg})`,
              }} />
            )}
            <div style={{
              display: "flex", gap: 4,
              flexWrap: isMobile ? "nowrap" : "wrap",
              overflowX: isMobile ? "auto" : "visible",
              scrollbarWidth: "none", msOverflowStyle: "none",
            }}>
              {/* Custom mode — pinned first, dashed gold border signals 'create' not 'select' */}
              <button
                onClick={() => { setShowCreateModal(true); setSelectedTemplate(null); setCreateName(""); setCreateInstruction(""); }}
                disabled={isBusy}
                style={{
                  flexShrink: 0,
                  background: "transparent",
                  border: `1px dashed ${S.gold}`,
                  borderRadius: 8, padding: "5px 9px",
                  color: S.gold,
                  cursor: isBusy ? "not-allowed" : "pointer",
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 11, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 4,
                  transition: "all 0.15s",
                  opacity: isBusy ? 0.4 : 0.85, whiteSpace: "nowrap",
                }}>
                <Icon name="wand" size={11} color={S.gold} />
                Custom
              </button>
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
              {/* Custom persona pills */}
              {customPersonas.map(cp => {
                const isActive   = persona === cp.id;
                const isRenaming = renamingPersonaId === cp.id;
                return isRenaming ? (
                  <input
                    key={cp.id}
                    autoFocus
                    value={renamePersonaValue}
                    onChange={e => setRenamePersonaValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const t = renamePersonaValue.trim();
                        if (t) handleRenamePersona(cp.id, t);
                        setRenamingPersonaId(null);
                      }
                      if (e.key === "Escape") setRenamingPersonaId(null);
                    }}
                    onBlur={() => {
                      const t = renamePersonaValue.trim();
                      if (t) handleRenamePersona(cp.id, t);
                      setRenamingPersonaId(null);
                    }}
                    style={{
                      flexShrink: 0, width: 110,
                      background: S.bg, border: `1px solid ${S.gold}`,
                      borderRadius: 8, padding: "5px 9px",
                      color: S.textDark, fontSize: 11, outline: "none",
                      fontFamily: "'Montserrat', sans-serif",
                    }}
                  />
                ) : (
                  <button
                    key={cp.id}
                    onClick={() => { if (!isBusy) setPersona(cp.id); }}
                    onMouseDown={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      longPressTimer.current = setTimeout(() => {
                        setPersonaMenuPos({ x: rect.left, y: rect.bottom + 4 });
                        setPersonaMenuId(cp.id);
                      }, 500);
                    }}
                    onMouseUp={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                    onTouchStart={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      longPressTimer.current = setTimeout(() => {
                        setPersonaMenuPos({ x: rect.left, y: rect.bottom + 4 });
                        setPersonaMenuId(cp.id);
                      }, 500);
                    }}
                    onTouchEnd={() => { if (longPressTimer.current) clearTimeout(longPressTimer.current); }}
                    disabled={isBusy}
                    style={{
                      flexShrink: 0,
                      background: isActive ? S.goldDim : "transparent",
                      border: `1px solid ${isActive ? S.gold : S.panelBorder}`,
                      borderRadius: 8, padding: "5px 9px",
                      color: isActive ? S.gold : S.textMid,
                      cursor: isBusy ? "not-allowed" : "pointer",
                      fontFamily: "'Montserrat', sans-serif",
                      fontSize: 11, fontWeight: 600,
                      display: "flex", alignItems: "center", gap: 4,
                      transition: "all 0.15s",
                      opacity: isBusy ? 0.5 : 1, whiteSpace: "nowrap",
                    }}>
                    ✦ {cp.name}
                  </button>
                );
              })}
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

      {/* Persona context menu (long-press on custom pill) */}
      {personaMenuId && personaMenuPos && customPersonas.some(p => p.id === personaMenuId) && (
        <>
          <div onClick={() => { setPersonaMenuId(null); setPersonaMenuPos(null); }}
            style={{ position: "fixed", inset: 0, zIndex: 90 }} />
          <div style={{
            position: "fixed",
            left: personaMenuPos.x,
            top: Math.min(personaMenuPos.y, window.innerHeight - 110),
            zIndex: 100, minWidth: 150,
            background: S.panelBg, border: `1px solid ${S.panelBorder}`,
            borderRadius: 10, boxShadow: S.shadow, overflow: "hidden",
          }}>
            <div
              onClick={e => {
                e.stopPropagation();
                const cp = customPersonas.find(p => p.id === personaMenuId)!;
                setRenamePersonaValue(cp.name);
                setRenamingPersonaId(cp.id);
                setPersonaMenuId(null);
                setPersonaMenuPos(null);
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                padding: "10px 14px", cursor: "pointer", fontSize: 11,
                fontWeight: 600, color: S.textMid,
                fontFamily: "'Montserrat', sans-serif", transition: "background 0.1s",
                borderBottom: `1px solid ${S.panelBorder}`,
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = S.bg}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
              <span>Rename</span>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </div>
            <div
              onClick={e => {
                e.stopPropagation();
                handleDeletePersona(personaMenuId!);
                setPersonaMenuId(null);
                setPersonaMenuPos(null);
              }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                padding: "10px 14px", cursor: "pointer", fontSize: 11,
                fontWeight: 600, color: "#FF5555",
                fontFamily: "'Montserrat', sans-serif", transition: "background 0.1s",
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,60,60,0.08)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
              <span>Delete</span>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" /><path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </div>
          </div>
        </>
      )}

      {/* Create custom mode modal */}
      {showCreateModal && (
        <>
          <div onClick={() => setShowCreateModal(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }} />
          <div style={{
            position: "fixed", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "min(420px, 92vw)", maxHeight: "80vh",
            background: S.panelBg, borderRadius: 16,
            border: `1px solid ${S.panelBorder}`,
            boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
            zIndex: 201, overflow: "hidden",
            display: "flex", flexDirection: "column",
          }}>
            {/* Header */}
            <div style={{ padding: "18px 18px 0", flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: S.textDark, marginBottom: 4 }}>
                Create Custom Mode
              </div>
              <div style={{ fontSize: 11, color: S.textMuted, marginBottom: 14 }}>
                Pick a template to pre-fill, or start blank.
              </div>
              {/* Template chips */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {PERSONA_TEMPLATES.map(t => (
                  <button key={t.id}
                    onClick={() => {
                      setSelectedTemplate(t.id);
                      setCreateName(t.id === "blank" ? "" : t.name);
                      setCreateInstruction(t.instruction);
                    }}
                    style={{
                      padding: "5px 10px", fontSize: 10, fontWeight: 600,
                      borderRadius: 20, cursor: "pointer",
                      fontFamily: "'Montserrat', sans-serif",
                      border: `1px solid ${selectedTemplate === t.id ? S.gold : S.panelBorder}`,
                      background: selectedTemplate === t.id ? S.goldDim : S.bg,
                      color: selectedTemplate === t.id ? S.gold : S.textMid,
                      transition: "all 0.12s",
                    }}>
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            {/* Body */}
            <div style={{ padding: "0 18px 16px", overflowY: "auto", flex: 1 }}>
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: S.textMuted,
                  letterSpacing: 1, textTransform: "uppercase", marginBottom: 5,
                }}>Name</div>
                <input
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="e.g. My Legal Reviewer"
                  maxLength={50}
                  style={{
                    width: "100%", background: S.bg,
                    border: `1px solid ${S.panelBorder}`,
                    borderRadius: 8, padding: "8px 10px",
                    color: S.textDark, fontSize: 12,
                    fontFamily: "'Montserrat', sans-serif",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
              <div>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: S.textMuted,
                  letterSpacing: 1, textTransform: "uppercase", marginBottom: 5,
                }}>Instruction</div>
                <textarea
                  value={createInstruction}
                  onChange={e => setCreateInstruction(e.target.value)}
                  placeholder="Describe how this mode should analyze documents…"
                  rows={5}
                  style={{
                    width: "100%", background: S.bg,
                    border: `1px solid ${S.panelBorder}`,
                    borderRadius: 8, padding: "8px 10px",
                    color: S.textDark, fontSize: 12, lineHeight: 1.6,
                    fontFamily: "'Montserrat', sans-serif",
                    outline: "none", resize: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>
            {/* Footer */}
            <div style={{
              padding: "12px 18px", flexShrink: 0,
              borderTop: `1px solid ${S.panelBorder}`,
              display: "flex", justifyContent: "flex-end", gap: 8,
            }}>
              <button
                onClick={() => { setShowCreateModal(false); setCreateName(""); setCreateInstruction(""); setSelectedTemplate(null); }}
                style={{
                  padding: "7px 14px", fontSize: 11, fontWeight: 600,
                  background: "transparent", border: `1px solid ${S.panelBorder}`,
                  borderRadius: 8, cursor: "pointer", color: S.textMid,
                  fontFamily: "'Montserrat', sans-serif",
                }}>
                Cancel
              </button>
              <button
                onClick={handleSavePersona}
                disabled={savingPersona || !createName.trim() || !createInstruction.trim()}
                style={{
                  padding: "7px 16px", fontSize: 11, fontWeight: 700,
                  background: S.gold, border: "none", borderRadius: 8,
                  cursor: savingPersona || !createName.trim() || !createInstruction.trim() ? "not-allowed" : "pointer",
                  color: "#fff", fontFamily: "'Montserrat', sans-serif",
                  opacity: savingPersona || !createName.trim() || !createInstruction.trim() ? 0.5 : 1,
                  transition: "opacity 0.15s",
                }}>
                {savingPersona ? "Saving…" : "Save Mode"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
