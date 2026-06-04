import { useState, useRef, useEffect } from "react";
import PdfLayout from "./layouts/PdfLayout";
import ChatLayout from "./layouts/ChatLayout";

export const PROXY_URL =
  "https://plain-firefly-95a9.sayanisamadder345.workers.dev/v1beta/models/gemini-2.5-flash:generateContent";

export const SUGGESTIONS = [
  "Summarize in 3 bullet points",
  "What are the key takeaways?",
  "List all action items",
  "Extract all dates and deadlines",
  "Explain in simple language",
  "What problems does this solve?",
];

export const PERSONAS = [
  {
    id: "analyst",
    label: "Analyst",
    icon: "chart",
    desc: "Data, metrics & trends",
    sys: "You are a sharp business analyst. Extract key data, metrics, trends, and conclusions. Structure clearly. Flag inconsistencies and numbers that deserve attention.",
  },
  {
    id: "teacher",
    label: "Teacher",
    icon: "grad",
    desc: "Step-by-step explanation",
    sys: "You are a patient and thorough teacher. Don't just summarize — explain the document step by step, like you're teaching a student encountering this topic for the first time. Use examples where helpful. Make sure the user truly understands, not just knows.",
  },
  {
    id: "lawyer",
    label: "Lawyer",
    icon: "law",
    desc: "Risks, rights & clauses",
    sys: "You are a careful legal reviewer. Identify obligations, rights, risks, liabilities, deadlines, and vague clauses. Use plain language. Remind user to consult a licensed lawyer.",
  },
  {
    id: "summarizer",
    label: "TL;DR",
    icon: "bolt",
    desc: "5 bullets, nothing extra",
    sys: "You are brutally concise. Give exactly 5 bullet points — the most important things from this document. Nothing extra.",
  },
  {
    id: "doctor",
    label: "Medical",
    icon: "heart",
    desc: "Plain-language medical",
    sys: "You are a patient-friendly medical explainer. Translate jargon into simple language. Summarize diagnosis, medications, treatment clearly. Always advise verifying with their doctor.",
  },
];

export const ICONS: Record<string, string> = {
  chart: "M3 3v18h18M7 16l4-4 4 4 4-8",
  grad: "M12 14l9-5-9-5-9 5 9 5zm0 0v6m-4-2h8",
  law: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  heart:
    "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
};

// PDF extraction
async function extractPDFText(file: File) {
  return new Promise<{ text: string; pages: number; words: number }>(
    (resolve, reject) => {
      if (!(window as any).pdfjsLib) {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
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
    }
  );
}

function parsePDF(file: File, resolve: any, reject: any) {
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const typedArray = new Uint8Array(e.target!.result as ArrayBuffer);
      const pdf = await (window as any).pdfjsLib.getDocument({
        data: typedArray,
      }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        fullText += content.items.map((item: any) => item.str).join(" ") + "\n";
      }
      resolve({
        text: fullText.trim(),
        pages: pdf.numPages,
        words: fullText.trim().split(/\s+/).length,
      });
    } catch (err) {
      reject(err);
    }
  };
  reader.onerror = reject;
  reader.readAsArrayBuffer(file);
}

export default function AppWrapper() {
  const [pdfText, setPdfText] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfMeta, setPdfMeta] = useState<{
    pages: number;
    words: string;
  } | null>(null);
  const [messages, setMessages] = useState<
    { role: string; text: string; ts: number }[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [persona, setPersona] = useState("analyst");
  const [dragOver, setDragOver] = useState(false);
  const [showHints, setShowHints] = useState(true);
  const [copied, setCopied] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [smartQs, setSmartQs] = useState<string[]>([]);
  const [loadingQs, setLoadingQs] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasPdf = !!pdfText;
  const currentP = PERSONAS.find((p) => p.id === persona)!;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
      setPdfMeta({
        pages: result.pages,
        words: result.words.toLocaleString(),
      });
      setMessages([
        {
          role: "assistant",
          text:
            "Ready! I have read every word of **" +
            file.name +
            "**. Switch modes below or tap a suggestion to start.",
          ts: Date.now(),
        },
      ]);
    } catch {
      setMessages([
        {
          role: "assistant",
          text: "Error reading PDF. Make sure it is not password protected.",
          ts: Date.now(),
        },
      ]);
    }
    setUploading(false);
  };

  const callGemini = async (question: string, context: string) => {
    const fullPrompt =
      currentP.sys +
      "\n\nDocument Content:\n" +
      context +
      "\n\nUser Question: " +
      question;
    const response = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      }),
    });
    const data = await response.json();
    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response generated."
    );
  };

  const send = async (text?: string) => {
    const q = (text || input).trim();
    if (!q || !pdfText || loading) return;
    setInput("");
    setShowHints(false);
    setMessages((prev) => [...prev, { role: "user", text: q, ts: Date.now() }]);
    setLoading(true);
    try {
      const reply = await callGemini(q, pdfText.slice(0, 12000));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: reply, ts: Date.now() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Error contacting proxy. Check your connection.",
          ts: Date.now(),
        },
      ]);
    }
    setLoading(false);
  };

  const generateSmartQs = async () => {
    if (!pdfText || loadingQs) return;
    setLoadingQs(true);
    setSmartQs([]);
    try {
      const prompt =
        "Based on this document, generate exactly 5 specific interesting questions a reader might ask. Return ONLY a JSON array of 5 strings, nothing else.\n\nDocument:\n" +
        pdfText.slice(0, 4000);
      const response = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      });
      const data = await response.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
      const clean = raw.replace(/```json|```/g, "").trim();
      const qs = JSON.parse(clean);
      setSmartQs(Array.isArray(qs) ? qs.slice(0, 5) : []);
    } catch {
      setSmartQs([
        "What is the main topic?",
        "What are the key conclusions?",
        "What action is recommended?",
      ]);
    }
    setLoadingQs(false);
  };

  const copy = (text: string, i: number) => {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  const fmt = (t: string) =>
    t
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\n/g, "<br/>");

  const reset = () => {
    setPdfText("");
    setPdfName("");
    setMessages([]);
    setPdfMeta(null);
    setSmartQs([]);
  };

  return hasPdf ? (
    <ChatLayout
      pdfMeta={pdfMeta}
      messages={messages}
      loading={loading}
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
    />
  ) : (
    <PdfLayout
      uploading={uploading}
      dragOver={dragOver}
      setDragOver={setDragOver}
      handleFile={handleFile}
      fileRef={fileRef}
    />
  );
}