import { useState, useRef, useEffect } from "react";
import PdfLayout from "./layouts/PdfLayoutNew";
import ChatLayout from "./layouts/ChatLayoutNew";
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';


// ── Splash Screen ──────────────────────────────────────────
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
        style={{ maxWidth: "min(100vw, 100%)", maxHeight: "100vh", width: "auto", height: "auto", display: "block", objectFit: "contain" }}
      />
    </div>
  );
}

// ── Constants ──────────────────────────────────────────────
export const QUERY_URL = "https://plain-firefly-95a9.sayanisamadder345.workers.dev/v1beta/models/gemini-2.5-flash:generateContent";

export const C = {
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

export const SUGGESTIONS = [
  "Summarize in 3 bullet points",
  "What are the key takeaways?",
  "List all action items",
  "Extract all dates and deadlines",
  "Explain in simple language",
  "What problems does this solve?",
];

export const LANGUAGES = [
  "English","Hindi","Bengali","Tamil","Telugu",
  "Marathi","Spanish","French","German","Portuguese",
  "Arabic","Japanese","Korean","Chinese (Simplified)",
];

export const PERSONAS = [
  { id: "analyst",    label: "Analyst",  icon: "chart", desc: "Data, metrics & insights",   sys: "You are a sharp business analyst. Extract key data, metrics, trends, and conclusions. Structure clearly. Flag inconsistencies and numbers that deserve attention." },
  { id: "teacher",   label: "Teacher",  icon: "grad",  desc: "Step-by-step explanations",  sys: "You are a patient and thorough teacher. Don't just summarize — explain the document step by step, like you're teaching a student encountering this topic for the first time. Use examples where helpful." },
  { id: "lawyer",    label: "Lawyer",   icon: "law",   desc: "Risks, rights & clauses",    sys: "You are a careful legal reviewer. Identify obligations, rights, risks, liabilities, deadlines, and vague clauses. Use plain language. Remind user to consult a licensed lawyer." },
  { id: "summarizer",label: "TL;DR",   icon: "bolt",  desc: "5 bullets, nothing extra",   sys: "You are brutally concise. Give exactly 5 bullet points — the most important things from this document. Nothing extra." },
  { id: "doctor",    label: "Medical",  icon: "cross", desc: "Plain-language medical info", sys: "You are a patient-friendly medical explainer. Translate jargon into simple language. Summarize diagnosis, medications, treatment clearly. Always advise verifying with their doctor." },
];

export const ICON_PATHS: Record<string, string> = {
  chart: "M18 20V10M12 20V4M6 20v-6",
  grad:  "M22 10v6M2 10l10-5 10 5-10 5zM6 12v5c3 3 9 3 12 0v-5",
  law:   "M12 3v4M3 7h18M7 7l2 9h6l2-9M12 3v4M5 21h14",
  bolt:  "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  cross: "M12 5v14M5 12h14",
};

// ── PDF Extraction ─────────────────────────────────────────
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
        fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
      }
      resolve({ text: fullText.trim(), pages: totalPages, words: fullText.trim().split(/\s+/).length });
    } catch (err) { reject(err); }
  };
  reader.onerror = reject;
  reader.readAsArrayBuffer(file);
}

// ── AppWrapper ─────────────────────────────────────────────
export default function AppWrapper() {
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
  const [splash, setSplash]       = useState(true);
  const [streaming, setStreaming] = useState(false);

  const fileRef     = useRef<HTMLInputElement>(null);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasPDF   = !!pdfText;
  const currentP = PERSONAS.find(p => p.id === persona)!;

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Splash screen timer
  useEffect(() => {
    const timer = setTimeout(() => setSplash(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  // PWA install prompt
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

  // Word-by-word streaming reveal
  const revealWords = (fullText: string) => {
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
  };

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || !pdfText || loading || streaming) return;
    setInput("");
    setShowHints(false);
    setMessages(prev => [...prev, { role: "user", text: q, ts: Date.now() }]);
    setLoading(true);
    setStreaming(true);

    const langInstruction = language !== "English" ? `\nAlways respond in ${language}.` : "";
    const fullPrompt = currentP.sys + langInstruction + "\n\nDocument Content:\n" + pdfText.slice(0, 12000) + "\n\nUser Question: " + q;

    try {
      const res = await fetch(QUERY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
          generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        const errMsg: string = data?.error?.message || `API error ${res.status}`;
        const retryMatch = errMsg.match(/retry in ([\d.]+)s/i);
        const retryHint = retryMatch ? ` Please wait ${Math.ceil(parseFloat(retryMatch[1]))} seconds and try again.` : "";
        const isQuota = res.status === 429;
        const friendly = isQuota
          ? `⚠️ The AI service is temporarily rate-limited (free tier quota reached).${retryHint}`
          : `⚠️ AI error (${res.status}): ${errMsg.slice(0, 120)}`;
        setLoading(false);
        setStreaming(false);
        setMessages(prev => [...prev, { role: "assistant", text: friendly, ts: Date.now() }]);
        return;
      }

      const fullText: string = data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated.";
      setLoading(false);
      revealWords(fullText);
    } catch {
      setLoading(false);
      setStreaming(false);
      setMessages(prev => [...prev, { role: "assistant", text: "⚠️ Could not reach the AI service. Check your connection and try again.", ts: Date.now() }]);
    }
  };

  const generateSmartQs = async () => {
    if (!pdfText || loadingQs) return;
    setLoadingQs(true);
    setSmartQs([]);
    try {
      const prompt = "Based on this document, generate exactly 5 specific interesting questions a reader might ask. Return ONLY a JSON array of 5 strings, nothing else.\n\nDocument:\n" + pdfText.slice(0, 4000);
      const res = await fetch(QUERY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { thinkingConfig: { thinkingBudget: 0 } },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `API ${res.status}`);
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

  const reset = () => {
    setPdfText(""); setPdfName(""); setMessages([]); setPdfMeta(null); setSmartQs([]);
  };

  return (
    <>
      <SplashScreen visible={splash} />
      {hasPDF ? (
        <ChatLayout
          pdfMeta={pdfMeta}
          messages={messages}
          loading={loading}
          streaming={streaming}
          persona={persona}
          setPersona={setPersona}
          input={input}
          setInput={setInput}
          send={send}
          copy={copy}
          copied={copied}
          showHints={showHints}
          smartQs={smartQs}
          loadingQs={loadingQs}
          generateSmartQs={generateSmartQs}
          fileRef={fileRef}
          bottomRef={bottomRef}
          textareaRef={textareaRef}
          handleFile={handleFile}
          onReset={reset}
          currentP={currentP}
          fmt={fmt}
          language={language}
          setLanguage={setLanguage}
          installPrompt={installPrompt}
          handleInstall={handleInstall}
        />
      ) : (
        <PdfLayout
          uploading={uploading}
          dragOver={dragOver}
          setDragOver={setDragOver}
          handleFile={handleFile}
          fileRef={fileRef}
          installPrompt={installPrompt}
          handleInstall={handleInstall}
        />
      )}
    </>
  );
}