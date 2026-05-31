import { useState, useRef, useEffect } from "react";

function SplashScreen({ visible }: { visible: boolean }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "#100D0B",
      display: "flex", alignItems: "center", justifyContent: "center",
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? "all" : "none",
      transition: "opacity 0.65s ease",
    }}>
      <img
        src="/splash-wordmark.png"
        alt="PageWise — Five Modes. One Insight."
        style={{
          maxWidth: "min(100vw, 100%)",
          maxHeight: "100vh",
          width: "auto",
          height: "auto",
          display: "block",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

const PROXY_URL = "https://plain-firefly-95a9.sayanisamadder345.workers.dev/v1beta/models/gemini-2.5-flash:generateContent";

const C = {
  bg:       "#FFF4E5",
  dark:     "#1A150F",
  orange:   "#FF8A00",
  gold:     "#FDAA3A",
  muted:    "#D9C7A8",
  cardBg:   "#FFFFFF",
  softBg:   "#FFF8F0",
  border:   "#D9C7A8",
  textMid:  "#6B4F2A",
  textDark: "#1A150F",
};

const SUGGESTIONS = [
  "Summarize in 3 bullet points",
  "What are the key takeaways?",
  "List all action items",
  "Extract all dates and deadlines",
  "Explain in simple language",
  "What problems does this solve?",
];

const PERSONAS = [
  { id: "analyst",    label: "Analyst",  icon: "chart", desc: "Data, metrics & insights",  sys: "You are a sharp business analyst. Extract key data, metrics, trends, and conclusions. Structure clearly. Flag inconsistencies and numbers that deserve attention." },
  { id: "teacher",   label: "Teacher",  icon: "grad",  desc: "Step-by-step explanations",  sys: "You are a patient and thorough teacher. Don't just summarize — explain the document step by step, like you're teaching a student encountering this topic for the first time. Use examples where helpful." },
  { id: "lawyer",    label: "Lawyer",   icon: "law",   desc: "Risks, rights & clauses",    sys: "You are a careful legal reviewer. Identify obligations, rights, risks, liabilities, deadlines, and vague clauses. Use plain language. Remind user to consult a licensed lawyer." },
  { id: "summarizer",label: "TL;DR",   icon: "bolt",  desc: "5 bullets, nothing extra",   sys: "You are brutally concise. Give exactly 5 bullet points — the most important things from this document. Nothing extra." },
  { id: "doctor",    label: "Medical", icon: "cross", desc: "Plain-language medical info", sys: "You are a patient-friendly medical explainer. Translate jargon into simple language. Summarize diagnosis, medications, treatment clearly. Always advise verifying with their doctor." },
];

const ICON_PATHS: Record<string, string> = {
  chart: "M18 20V10M12 20V4M6 20v-6",
  grad:  "M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5",
  law:   "M12 3v4M3 7h18M7 7l2 9h6l2-9M12 3v4M5 21h14",
  bolt:  "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  cross: "M12 5v14M5 12h14",
};

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

async function extractPDFText(file: File): Promise<{ text: string; pages: number; words: number }> {
  return new Promise((resolve, reject) => {
    if (!(window as any).pdfjsLib) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        parsePDF(file, resolve, reject);
      };
      script.onerror = () => reject(new Error("Failed to load PDF parser"));
      document.head.appendChild(script);
    } else {
      parsePDF(file, resolve, reject);
    }
  });
}

function parsePDF(file: File, resolve: (v: any) => void, reject: (e: any) => void) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const typedArray = new Uint8Array(e.target!.result as ArrayBuffer);
      const pdf = await (window as any).pdfjsLib.getDocument({ data: typedArray }).promise;
      let fullText = "";
      const totalPages = pdf.numPages;
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }
      resolve({ text: fullText.trim(), pages: totalPages, words: fullText.trim().split(/\s+/).length });
    } catch (err) { reject(err); }
  };
  reader.onerror = reject;
  reader.readAsArrayBuffer(file);
}

export default function PageWise() {
  const [pdfText, setPdfText]     = useState("");
  const [pdfName, setPdfName]     = useState("");
  const [pdfMeta, setPdfMeta]     = useState<{ pages: number; words: string } | null>(null);
  const [messages, setMessages]   = useState<{ role: string; text: string; ts: number }[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [persona, setPersona]     = useState("analyst");
  const [dragOver, setDragOver]   = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [copied, setCopied]       = useState<number | null>(null);
  const [language, setLanguage]   = useState("English");
  const [uploading, setUploading] = useState(false);
  const [smartQs, setSmartQs]     = useState<string[]>([]);
  const [loadingQs, setLoadingQs] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [splash, setSplash] = useState(true);

  const fileRef     = useRef<HTMLInputElement>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  const currentP = PERSONAS.find(p => p.id === persona)!;
  const hasPDF   = !!pdfText;

  const handleFile = async (file: File) => {
    if (!file || file.type !== "application/pdf") { alert("Please upload a PDF file."); return; }
    setPdfName(file.name);
    setMessages([]);
    setShowHints(true);
    setPdfText("");
    setPdfMeta(null);
    setSmartQs([]);
    setUploading(true);
    try {
      const result = await extractPDFText(file);
      setPdfText(result.text);
      setPdfMeta({ pages: result.pages, words: result.words.toLocaleString() });
      setMessages([{ role: "assistant", text: "Ready! I've read every word of **" + file.name + "**. Pick a mode below or tap a suggestion to start.", ts: Date.now() }]);
    } catch {
      setMessages([{ role: "assistant", text: "Error reading PDF. Make sure it is not password-protected.", ts: Date.now() }]);
    }
    setUploading(false);
  };

  const callGemini = async (question: string, context: string): Promise<string> => {
    const langInstruction = language !== "English" ? `\nAlways respond in ${language}.` : "";
    const fullPrompt = currentP.sys + langInstruction + "\n\nDocument Content:\n" + context + "\n\nUser Question: " + question;
    const doFetch = async () => {
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: fullPrompt }] }] }),
      });
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
    };
    let result = await doFetch();
    if (!result) { await new Promise(r => setTimeout(r, 2000)); result = await doFetch(); }
    return result || "No response generated.";
  };

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || !pdfText || loading) return;
    setInput("");
    setShowHints(false);
    setMessages(prev => [...prev, { role: "user", text: q, ts: Date.now() }]);
    setLoading(true);
    try {
      const reply = await callGemini(q, pdfText.slice(0, 12000));
      setMessages(prev => [...prev, { role: "assistant", text: reply, ts: Date.now() }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Error contacting AI. Check your connection.", ts: Date.now() }]);
    }
    setLoading(false);
  };

  const generateSmartQs = async () => {
    if (!pdfText || loadingQs) return;
    setLoadingQs(true);
    setSmartQs([]);
    try {
      const prompt = "Based on this document, generate exactly 5 specific interesting questions a reader might ask. Return ONLY a JSON array of 5 strings, nothing else.\n\nDocument:\n" + pdfText.slice(0, 4000);
      const res = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
      });
      const data = await res.json();
      const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const clean = raw.replace(/```json|```/g, "").trim();
      const qs    = JSON.parse(clean);
      setSmartQs(Array.isArray(qs) ? qs.slice(0, 5) : []);
    } catch {
      setSmartQs([
        "What is the main purpose of this document?",
        "What are the key obligations mentioned?",
        "Are there any deadlines or dates?",
        "What risks are identified?",
        "What action should I take after reading this?",
      ]);
    }
    setLoadingQs(false);
  };

  const copy = (text: string, i: number) => {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  const fmt = (t: string) => {
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
  };

  const btnStyle = (active = false): React.CSSProperties => ({
    flexShrink: 0,
    background: active ? C.dark : "transparent",
    border: `1px solid ${active ? C.orange : C.border}`,
    borderRadius: 8, padding: "5px 9px",
    color: active ? C.gold : C.textMid,
    cursor: "pointer", transition: "all 0.15s",
    fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 600,
    display: "flex", alignItems: "center", gap: 4,
  });

  return (
    <div style={{ height: "100vh", background: C.bg, fontFamily: "'Montserrat', sans-serif", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SplashScreen visible={splash} />
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .msg { animation: fadeUp 0.22s ease forwards; }
        .pill:hover { background:${C.softBg}!important; border-color:${C.orange}!important; color:${C.dark}!important; }
        .send-btn:hover:not(:disabled) { background:#CC6F00!important; }
        .mode-btn:hover { background:${C.softBg}!important; }
        .drop-zone:hover { border-color:${C.orange}!important; background:${C.softBg}!important; }
        ::-webkit-scrollbar { width:3px }
        ::-webkit-scrollbar-thumb { background:${C.muted}; border-radius:2px }
        * { box-sizing:border-box; }
        textarea::placeholder { color:${C.muted}; font-style:italic; font-family:'Montserrat',sans-serif; }
        select { font-family:'Montserrat',sans-serif; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: C.dark, padding: "10px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `2px solid ${C.orange}`, flexShrink: 0 }}>
        <img
          src="/header-logo.png"
          alt="PageWise"
          style={{ height: 40, width: "auto", display: "block", objectFit: "contain" }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {pdfMeta && (
            <div style={{ fontSize: 10, color: C.muted, fontFamily: "'Montserrat',sans-serif", background: "#2A1E10", padding: "3px 9px", borderRadius: 6, border: "1px solid #3A2810", fontWeight: 600 }}>
              {pdfMeta.pages}pp / {pdfMeta.words}w
            </div>
          )}
          {hasPDF && (
            <button onClick={() => { setPdfText(""); setPdfName(""); setMessages([]); setPdfMeta(null); setSmartQs([]); }}
              style={{ background: "transparent", border: `1px solid #3A2810`, borderRadius: 6, padding: "4px 10px", color: "#8B6A3A", fontSize: 10, cursor: "pointer", fontFamily: "'Montserrat',sans-serif", fontWeight: 600 }}>
              New PDF
            </button>
          )}
          {installPrompt && (
            <button onClick={handleInstall} style={{ background: C.orange, border: "none", borderRadius: 6, padding: "5px 11px", color: C.dark, fontSize: 10, cursor: "pointer", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, whiteSpace: "nowrap" }}>
              📲 Install
            </button>
          )}
          {typeof navigator !== "undefined" && !!navigator.share && (
            <button onClick={() => navigator.share({ title: "PageWise", text: "Chat with any PDF using AI", url: window.location.href })}
              style={{ background: C.orange, border: "none", borderRadius: 6, padding: "5px 11px", color: C.dark, fontSize: 10, cursor: "pointer", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, whiteSpace: "nowrap" }}>
              🔗 Share
            </button>
          )}
          <a href="https://tally.so/r/yPzqV8" target="_blank" rel="noopener noreferrer"
            style={{ background: C.orange, border: "none", borderRadius: 6, padding: "5px 11px", color: C.dark, fontSize: 10, cursor: "pointer", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
            🚀 Join Waitlist
          </a>
        </div>
      </div>

      {/* ── Upload screen ── */}
      {!hasPDF ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
            <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 36, color: C.dark, lineHeight: 1.2, marginBottom: 10, fontWeight: 700 }}>
              Every document<br />has a story.
            </h1>
            <p style={{ fontSize: 14, color: C.textMid, marginBottom: 28, lineHeight: 1.8, fontWeight: 500 }}>
              Drop your PDF and start a conversation.<br />Switch AI modes anytime — no scrolling needed.
            </p>

            <div
              className="drop-zone"
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current!.click()}
              style={{ border: `2px dashed ${dragOver ? C.orange : C.muted}`, borderRadius: 16, padding: "44px 28px", cursor: "pointer", background: dragOver ? C.softBg : C.cardBg, transition: "all 0.2s", marginBottom: 20 }}
            >
              {uploading ? (
                <div style={{ color: C.orange, fontSize: 14 }}>Reading PDF... <Dots /></div>
              ) : (
                <div>
                  <div style={{ fontSize: 42, marginBottom: 10, color: C.orange, fontWeight: "bold" }}>[PDF]</div>
                  <div style={{ fontSize: 15, color: C.dark, fontWeight: 700, marginBottom: 4 }}>Drop PDF here</div>
                  <div style={{ fontSize: 12, color: C.textMid }}>or click to browse</div>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files![0])} />
            </div>

            <a href="https://tally.so/r/yPzqV8" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", background: C.orange, borderRadius: 8, padding: "10px 24px", color: C.dark, fontSize: 13, fontWeight: 700, textDecoration: "none", marginBottom: 24 }}>
              🚀 Join Waitlist
            </a>

            {/* Mode cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {PERSONAS.map(p => (
                <div key={p.id} style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ marginTop: 1 }}><Icon name={p.icon} size={14} color={C.orange} /></div>
                  <div>
                    <div style={{ fontSize: 13, color: C.dark, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: C.textMid, marginTop: 1 }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: 1 }}>
              POWERED BY GEMINI 2.5 FLASH
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 8px", display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map((msg, i) => (
              <div key={i} className="msg" style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", gap: 8, alignItems: "flex-start" }}>
                {msg.role === "assistant" && (
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: C.dark, border: `1px solid ${C.orange}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
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
                    <button onClick={() => copy(msg.text, i)} style={{
                      marginTop: 5,
                      background: copied === i ? C.orange : C.cardBg,
                      border: `1.5px solid ${C.orange}`,
                      borderRadius: 7, cursor: "pointer",
                      padding: "4px 10px",
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
                  )}
                </div>
                {msg.role === "user" && (
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: C.orange, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: C.dark, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>U</div>
                )}
              </div>
            ))}

            {loading && (
              <div className="msg" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: C.dark, border: `1px solid ${C.orange}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                  <button onClick={generateSmartQs} disabled={loadingQs} style={{
                    background: loadingQs ? C.softBg : C.dark,
                    border: `1px solid ${C.orange}`, borderRadius: 20,
                    padding: "3px 10px", fontSize: 10,
                    color: loadingQs ? C.textMid : C.gold,
                    cursor: loadingQs ? "not-allowed" : "pointer",
                    fontFamily: "'Montserrat',sans-serif", fontWeight: 600,
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                    {loadingQs ? <span><Dots /> thinking</span> : "✦ Ask for me"}
                  </button>
                </div>

                {smartQs.length === 0 && !loadingQs && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {SUGGESTIONS.map((q, i) => (
                      <button key={i} className="pill" onClick={() => send(q)} style={{
                        background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 20,
                        padding: "5px 13px", fontSize: 11, color: C.textMid, cursor: "pointer",
                        transition: "all 0.15s", fontFamily: "'Montserrat',sans-serif", fontWeight: 500,
                      }}>{q}</button>
                    ))}
                  </div>
                )}

                {smartQs.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {smartQs.map((q, i) => (
                      <button key={i} className="pill" onClick={() => { send(q); setSmartQs([]); }} style={{
                        background: C.cardBg, border: `1px solid ${C.orange}`,
                        borderRadius: 10, padding: "8px 14px", fontSize: 13,
                        color: C.textMid, cursor: "pointer", transition: "all 0.15s",
                        textAlign: "left", lineHeight: 1.4,
                        display: "flex", alignItems: "flex-start", gap: 8,
                        fontFamily: "'Montserrat',sans-serif", fontWeight: 500,
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

          {/* ── Bottom toolbar ── */}
          <div style={{ background: C.cardBg, borderTop: `1px solid ${C.border}`, padding: "10px 16px 14px", flexShrink: 0 }}>

            {/* Mode + Language row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 9, color: C.muted, letterSpacing: 3, textTransform: "uppercase", fontWeight: 700, flexShrink: 0 }}>Mode</span>
              <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "nowrap", overflowX: "auto" }}>
                {PERSONAS.map(p => (
                  <button key={p.id} className="mode-btn" onClick={() => setPersona(p.id)} title={p.desc} style={btnStyle(persona === p.id)}>
                    <Icon name={p.icon} size={11} color={persona === p.id ? C.gold : C.textMid} />
                    {p.label}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 }}>Lang</span>
                <select value={language} onChange={e => setLanguage(e.target.value)} style={{
                  background: C.bg, border: `1px solid ${C.border}`, borderRadius: 7,
                  padding: "4px 6px", fontSize: 11, color: C.dark,
                  cursor: "pointer", outline: "none", maxWidth: 100, fontWeight: 500,
                }}>
                  {["English","Hindi","Bengali","Tamil","Telugu","Marathi","Spanish","French","German","Portuguese","Arabic","Japanese","Korean","Chinese (Simplified)"].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Input row */}
            <div style={{ display: "flex", gap: 8, background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: 12, padding: "6px 8px 6px 14px", alignItems: "flex-end" }}>
              <button onClick={() => fileRef.current!.click()} title="Load new PDF"
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, marginBottom: 5, opacity: 0.5, transition: "opacity 0.15s", fontSize: 11, color: C.textMid, fontFamily: "'Montserrat',sans-serif", fontWeight: 700 }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "0.5"}
              >PDF+</button>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files![0])} />

              <textarea ref={textareaRef} value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={`Ask in ${currentP.label} mode...`}
                rows={1}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontSize: 14, color: C.dark, fontFamily: "'Montserrat',sans-serif", resize: "none", lineHeight: 1.6, paddingTop: 5, paddingBottom: 5, maxHeight: 90 }}
              />

              <button className="send-btn" onClick={() => send()} disabled={!input.trim() || loading}
                style={{ background: (!input.trim() || loading) ? C.muted : C.orange, border: "none", borderRadius: 9, width: 36, height: 36, cursor: (!input.trim() || loading) ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, transition: "all 0.15s", flexShrink: 0, color: (!input.trim() || loading) ? "#8B6A3A" : C.dark, fontWeight: "bold" }}>
                ^
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, fontWeight: 600 }}>Enter to send  |  Shift+Enter new line</div>
              <div style={{ fontSize: 9, color: C.orange, fontWeight: 700, letterSpacing: 1 }}>GEMINI 2.5 FLASH</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
