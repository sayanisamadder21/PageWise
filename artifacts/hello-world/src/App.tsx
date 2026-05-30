import { useState, useRef, useEffect } from "react";

// Your Gemini proxy
const PROXY_URL = "https://plain-firefly-95a9.sayanisamadder345.workers.dev/v1beta/models/gemini-2.5-flash:generateContent";

const SUGGESTIONS = [
  "Summarize in 3 bullet points",
  "What are the key takeaways?",
  "List all action items",
  "Extract all dates and deadlines",
  "Explain in simple language",
  "What problems does this solve?",
];

const PERSONAS = [
  { id: "analyst",    label: "Analyst",  icon: "chart", desc: "Data, metrics & trends",   sys: "You are a sharp business analyst. Extract key data, metrics, trends, and conclusions. Structure clearly. Flag inconsistencies and numbers that deserve attention." },
  { id: "teacher",    label: "Teacher",  icon: "grad",  desc: "Step-by-step explanation",  sys: "You are a patient and thorough teacher. Don't just summarize — explain the document step by step, like you're teaching a student encountering this topic for the first time. Use examples where helpful. Make sure the user truly understands, not just knows." },
  { id: "lawyer",     label: "Lawyer",   icon: "law",   desc: "Risks, rights & clauses",   sys: "You are a careful legal reviewer. Identify obligations, rights, risks, liabilities, deadlines, and vague clauses. Use plain language. Remind user to consult a licensed lawyer." },
  { id: "summarizer", label: "TL;DR",   icon: "bolt",  desc: "5 bullets, nothing extra",  sys: "You are brutally concise. Give exactly 5 bullet points — the most important things from this document. Nothing extra." },
  { id: "doctor",     label: "Medical", icon: "heart", desc: "Plain-language medical",     sys: "You are a patient-friendly medical explainer. Translate jargon into simple language. Summarize diagnosis, medications, treatment clearly. Always advise verifying with their doctor." },
];

const ICONS: Record<string, string> = {
  chart: "M3 3v18h18M7 16l4-4 4 4 4-8",
  grad:  "M12 14l9-5-9-5-9 5 9 5zm0 0v6m-4-2h8",
  law:   "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  bolt:  "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  heart: "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
};

function Icon({ name, size = 14, color = "currentColor" }: { name: string; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: "#f59e0b",
          display: "inline-block",
          animation: "bounce 1.2s " + (i * 0.2) + "s infinite ease-in-out",
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
    } catch (err) {
      reject(err);
    }
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

  const fileRef     = useRef<HTMLInputElement>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current && bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const currentP = PERSONAS.find(p => p.id === persona)!;
  const hasPDF   = !!pdfText;

  const handleFile = async (file: File) => {
    if (!file || file.type !== "application/pdf") {
      alert("Please upload a PDF file.");
      return;
    }
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
      setMessages([{
        role: "assistant",
        text: "Ready! I have read every word of **" + file.name + "**. Switch modes below or tap a suggestion to start.",
        ts: Date.now()
      }]);
    } catch (err) {
      setMessages([{ role: "assistant", text: "Error reading PDF. Make sure it is not password protected.", ts: Date.now() }]);
    }
    setUploading(false);
  };

  const callGemini = async (question: string, context: string): Promise<string> => {
    const langInstruction = language !== "English" ? `\nAlways respond in ${language}.` : "";
    const fullPrompt = currentP.sys + langInstruction + "\n\nDocument Content:\n" + context + "\n\nUser Question: " + question;
    const doFetch = async () => {
      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }]
        })
      });
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
    };

    let result = await doFetch();
    if (!result) {
      await new Promise(res => setTimeout(res, 2000));
      result = await doFetch();
    }
    return result || "No response generated.";
  };

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || !pdfText || loading) return;
    setInput("");
    setShowHints(false);
    const userMsg = { role: "user", text: q, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const reply = await callGemini(q, pdfText.slice(0, 12000));
      setMessages(prev => [...prev, { role: "assistant", text: reply, ts: Date.now() }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: "assistant", text: "Error contacting proxy. Check your connection.", ts: Date.now() }]);
    }
    setLoading(false);
  };

  const generateSmartQs = async () => {
    if (!pdfText || loadingQs) return;
    setLoadingQs(true);
    setSmartQs([]);
    try {
      const prompt = "Based on this document, generate exactly 5 specific interesting questions a reader might ask. Return ONLY a JSON array of 5 strings, nothing else.\n\nDocument:\n" + pdfText.slice(0, 4000);
      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }]
        })
      });
      const data = await response.json();
      const raw   = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const clean = raw.replace(/```json|```/g, "").trim();
      const qs    = JSON.parse(clean);
      setSmartQs(Array.isArray(qs) ? qs.slice(0, 5) : []);
    } catch (e) {
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
    return t
      .split("\n")
      .map(line => {
        line = line
          .replace(/^##\s+(.+)$/, "<div style='font-size:1.15em;font-weight:700;margin:6px 0 2px'>$1</div>")
          .replace(/^###\s+(.+)$/, "<div style='font-size:1.05em;font-weight:700;margin:4px 0 2px'>$1</div>");
        if (/^[-*]\s/.test(line)) {
          line = "<div style='display:flex;gap:6px;margin:2px 0'><span style='color:#d97706;flex-shrink:0'>•</span><span>" + line.replace(/^[-*]\s/, "") + "</span></div>";
        }
        line = line
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>");
        return line;
      })
      .join("<br/>");
  };

  return (
    <div style={{
      height: "100vh", background: "#faf7f2",
      fontFamily: "Palatino Linotype, Georgia, serif",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .msg { animation: fadeUp 0.22s ease forwards; }
        .pill:hover { background:#fef3c7!important; border-color:#f59e0b!important; color:#92400e!important; }
        .send-btn:hover:not(:disabled) { background:#b45309!important; }
        .cp:hover { opacity:1!important; }
        .mode-btn:hover { background:#fef3c7!important; }
        .drop-zone:hover { border-color:#d97706!important; background:#fffbf2!important; }
        ::-webkit-scrollbar { width:3px }
        ::-webkit-scrollbar-thumb { background:#d6c9a8; border-radius:2px }
        * { box-sizing:border-box; }
        textarea::placeholder { color:#c9b99a; font-style:italic; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "#1c1208", padding: "12px 20px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "2px solid #d97706", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, background: "#d97706", borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#1c1208", fontWeight: "bold",
          }}>P</div>
          <div>
            <div style={{ fontSize: 18, color: "#fef3c7", fontWeight: 600 }}>PageWise</div>
            <div style={{ fontSize: 9, color: "#78350f", letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace" }}>Chat with any PDF</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {pdfMeta && (
            <div style={{ fontSize: 11, color: "#92400e", fontFamily: "monospace", background: "#2d1f0a", padding: "4px 10px", borderRadius: 6, border: "1px solid #3d2a10" }}>
              {pdfMeta.pages}pp / {pdfMeta.words}w
            </div>
          )}
          {hasPDF && (
            <button onClick={() => { setPdfText(""); setPdfName(""); setMessages([]); setPdfMeta(null); setSmartQs([]); }}
              style={{ background: "transparent", border: "1px solid #3d2a10", borderRadius: 6, padding: "4px 10px", color: "#78350f", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>
              New PDF
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {!hasPDF ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
          <div style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
            <div style={{ fontSize: 34, color: "#1c1208", lineHeight: 1.2, marginBottom: 10, fontWeight: 600 }}>
              Every document<br />has a story.
            </div>
            <div style={{ fontSize: 14, color: "#92400e", marginBottom: 32, lineHeight: 1.7 }}>
              Drop your PDF and start a conversation.<br />Switch AI modes anytime — no scrolling needed.
            </div>

            <div
              className="drop-zone"
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current!.click()}
              style={{
                border: "2px dashed " + (dragOver ? "#d97706" : "#d6c9a8"),
                borderRadius: 16, padding: "44px 28px", cursor: "pointer",
                background: dragOver ? "#fffbf2" : "#fff",
                transition: "all 0.2s", marginBottom: 20,
              }}
            >
              {uploading ? (
                <div style={{ color: "#d97706", fontSize: 14, fontFamily: "monospace" }}>
                  Reading PDF... <Dots />
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 40, marginBottom: 10, color: "#d97706", fontWeight: "bold", fontFamily: "monospace" }}>[PDF]</div>
                  <div style={{ fontSize: 15, color: "#1c1208", fontWeight: 600, marginBottom: 4 }}>Drop PDF here</div>
                  <div style={{ fontSize: 12, color: "#92400e" }}>or click to browse</div>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
                onChange={e => handleFile(e.target.files![0])} />
            </div>

            {/* Persona preview */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {PERSONAS.map(p => (
                <div key={p.id} style={{ background: "#fff", border: "1px solid #e8dfc8", borderRadius: 10, padding: "10px 12px", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 8 }}>
                  <Icon name={p.icon} size={14} color="#d97706" />
                  <div>
                    <div style={{ fontSize: 13, color: "#1c1208", fontWeight: 600 }}>{p.label}</div>
                    <div style={{ fontSize: 11, color: "#92400e", fontFamily: "monospace" }}>{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 11, color: "#b45309", fontFamily: "monospace" }}>
              Powered by Gemini 2.5 Flash
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
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: "#1c1208", border: "1px solid #d97706", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    <Icon name={currentP.icon} size={13} color="#d97706" />
                  </div>
                )}
                <div style={{ maxWidth: "75%", position: "relative" }}>
                  <div style={{
                    background: msg.role === "user" ? "#1c1208" : "#fff",
                    border: msg.role === "user" ? "1px solid #2d1f0a" : "1px solid #e8dfc8",
                    borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px",
                    padding: "10px 14px", fontSize: 14,
                    color: msg.role === "user" ? "#fef3c7" : "#2c1a05",
                    lineHeight: 1.75,
                  }} dangerouslySetInnerHTML={{ __html: fmt(msg.text) }} />
                  {msg.role === "assistant" && (
                    <button className="cp" onClick={() => copy(msg.text, i)} title="Copy response" style={{
                      position: "absolute", top: 6, right: -34,
                      background: copied === i ? "#fef3c7" : "transparent",
                      border: copied === i ? "1px solid #d97706" : "1px solid transparent",
                      borderRadius: 6, cursor: "pointer",
                      padding: "3px 6px", opacity: copied === i ? 1 : 0.35,
                      transition: "all 0.15s", color: "#92400e",
                      display: "flex", alignItems: "center", gap: 3,
                      fontSize: 10, fontFamily: "monospace", whiteSpace: "nowrap",
                    }}>
                      {copied === i ? (
                        "✓ Copied!"
                      ) : (
                        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                      )}
                    </button>
                  )}
                </div>
                {msg.role === "user" && (
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: "#d97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#1c1208", fontWeight: "bold", fontFamily: "monospace", flexShrink: 0, marginTop: 2 }}>U</div>
                )}
              </div>
            ))}

            {loading && (
              <div className="msg" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "#1c1208", border: "1px solid #d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={currentP.icon} size={13} color="#d97706" />
                </div>
                <div style={{ background: "#fff", border: "1px solid #e8dfc8", borderRadius: "4px 14px 14px 14px", padding: "12px 16px" }}>
                  <Dots />
                </div>
              </div>
            )}

            {/* Suggestions */}
            {showHints && messages.length <= 1 && (
              <div className="msg">
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ fontSize: 9, color: "#b45309", letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace" }}>Try asking</div>
                  <button
                    onClick={generateSmartQs}
                    disabled={loadingQs}
                    style={{
                      background: loadingQs ? "#fef3c7" : "#1c1208",
                      border: "1px solid #d97706", borderRadius: 20,
                      padding: "3px 10px", fontSize: 10,
                      color: loadingQs ? "#92400e" : "#fbbf24",
                      cursor: loadingQs ? "not-allowed" : "pointer",
                      fontFamily: "monospace",
                      display: "inline-flex", alignItems: "center", gap: 4,
                    }}
                  >
                    {loadingQs ? <span><Dots /> thinking</span> : "* Ask for me"}
                  </button>
                </div>

                {smartQs.length === 0 && !loadingQs && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {SUGGESTIONS.map((q, i) => (
                      <button key={i} className="pill" onClick={() => send(q)} style={{
                        background: "#fff", border: "1px solid #e8dfc8", borderRadius: 20,
                        padding: "5px 13px", fontSize: 12, color: "#78350f", cursor: "pointer",
                        transition: "all 0.15s", fontFamily: "monospace",
                      }}>{q}</button>
                    ))}
                  </div>
                )}

                {smartQs.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {smartQs.map((q, i) => (
                      <button key={i} className="pill" onClick={() => { send(q); setSmartQs([]); }} style={{
                        background: "#fff", border: "1px solid #d97706",
                        borderRadius: 10, padding: "8px 14px",
                        fontSize: 13, color: "#78350f", cursor: "pointer",
                        transition: "all 0.15s",
                        textAlign: "left", lineHeight: 1.4,
                        display: "flex", alignItems: "flex-start", gap: 8,
                      }}>
                        <span style={{ color: "#d97706", fontFamily: "monospace", fontSize: 11, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
                        {q}
                      </button>
                    ))}
                    <button onClick={generateSmartQs} style={{
                      background: "transparent", border: "none",
                      color: "#b45309", fontSize: 11, cursor: "pointer",
                      fontFamily: "monospace", textAlign: "left",
                      padding: "2px 0", textDecoration: "underline",
                    }}>refresh questions</button>
                  </div>
                )}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Bottom toolbar */}
          <div style={{ background: "#fff", borderTop: "1px solid #e8dfc8", padding: "10px 16px 14px", flexShrink: 0 }}>

            {/* Mode switcher */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 9, color: "#c9b99a", letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace", flexShrink: 0 }}>Mode</span>
              <div style={{ display: "flex", gap: 4, flex: 1, flexWrap: "nowrap", overflowX: "auto" }}>
                {PERSONAS.map(p => (
                  <button
                    key={p.id}
                    className="mode-btn"
                    onClick={() => setPersona(p.id)}
                    title={p.desc}
                    style={{
                      flexShrink: 0,
                      background: persona === p.id ? "#1c1208" : "transparent",
                      border: persona === p.id ? "1px solid #d97706" : "1px solid #e8dfc8",
                      borderRadius: 8, padding: "5px 8px",
                      color: persona === p.id ? "#fbbf24" : "#92400e",
                      cursor: "pointer", transition: "all 0.15s",
                      fontFamily: "monospace", fontSize: 11,
                      display: "flex", alignItems: "center", gap: 4,
                    }}
                  >
                    <Icon name={p.icon} size={11} color={persona === p.id ? "#fbbf24" : "#92400e"} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <span style={{ fontSize: 9, color: "#c9b99a", letterSpacing: 3, textTransform: "uppercase", fontFamily: "monospace", flexShrink: 0 }}>Lang</span>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                style={{
                  background: "#faf7f2", border: "1px solid #e8dfc8", borderRadius: 8,
                  padding: "4px 8px", fontSize: 11, color: "#78350f",
                  fontFamily: "monospace", cursor: "pointer", outline: "none",
                }}
              >
                {["English","Hindi","Bengali","Tamil","Telugu","Marathi","Spanish","French","German","Portuguese","Arabic","Japanese","Korean","Chinese (Simplified)"].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            {/* Input row */}
            <div style={{ display: "flex", gap: 8, background: "#faf7f2", border: "1.5px solid #e8dfc8", borderRadius: 12, padding: "6px 8px 6px 14px", alignItems: "flex-end" }}>
              <button
                onClick={() => fileRef.current!.click()}
                title="Load new PDF"
                style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, marginBottom: 5, opacity: 0.5, transition: "opacity 0.15s", fontSize: 11, color: "#92400e", fontFamily: "monospace", fontWeight: "bold" }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = "1"}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = "0.5"}
              >PDF+</button>
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files![0])} />

              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={"Ask in " + currentP.label + " mode..."}
                rows={1}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontSize: 14, color: "#1c1208", fontFamily: "Palatino, Georgia, serif",
                  resize: "none", lineHeight: 1.6, paddingTop: 5, paddingBottom: 5, maxHeight: 90,
                }}
              />

              <button
                className="send-btn"
                onClick={() => send()}
                disabled={!input.trim() || loading}
                style={{
                  background: (!input.trim() || loading) ? "#e8dfc8" : "#d97706",
                  border: "none", borderRadius: 9, width: 36, height: 36,
                  cursor: (!input.trim() || loading) ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 18, transition: "all 0.15s", flexShrink: 0,
                  color: (!input.trim() || loading) ? "#b45309" : "#fff", fontWeight: "bold",
                }}
              >^</button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
              <div style={{ fontSize: 9, color: "#d6c9a8", fontFamily: "monospace", letterSpacing: 1 }}>
                Enter to send  |  Shift+Enter new line
              </div>
              <div style={{ fontSize: 9, color: "#b45309", fontFamily: "monospace" }}>
                Gemini 2.5 Flash
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
