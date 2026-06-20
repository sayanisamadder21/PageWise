import { useState, useEffect } from "react";
import { supabase } from "../../../supabase";
import { S } from "../ProLayout";

interface Message { role: string; text: string; ts: number; }

interface Doc { id: string; name: string; extracted_text: string; }

interface Excerpt { docName: string; pageNum: number; text: string; }

interface SourcesPanelProps {
  messages: Message[];
  activeWorkspace: string;
}

function extractPageText(extractedText: string, pageNum: number): string {
  const parts = extractedText.split(/(\[Page \d+\])/i);
  for (let i = 0; i < parts.length - 1; i++) {
    const m = parts[i].trim().match(/^\[Page (\d+)\]$/i);
    if (m && parseInt(m[1]) === pageNum) {
      return parts[i + 1]?.trim().slice(0, 280) || "";
    }
  }
  return "";
}

export default function SourcesPanel({ messages, activeWorkspace }: SourcesPanelProps) {
  const [docs, setDocs] = useState<Doc[]>([]);

  useEffect(() => {
    if (!activeWorkspace) { setDocs([]); return; }
    supabase
      .from("documents")
      .select("id, name, extracted_text")
      .eq("workspace_id", activeWorkspace)
      .then(({ data }) => setDocs(data || []));
  }, [activeWorkspace]);

  const citedPages = new Set<number>();
  messages.filter(m => m.role === "assistant").forEach(m => {
    const re = /\[(?:p\.|page\s*)(\d+(?:[-–]\d+)?)\]/gi;
    let match;
    while ((match = re.exec(m.text)) !== null) {
      const first = parseInt(match[1]);
      if (!isNaN(first)) citedPages.add(first);
    }
  });

  const excerpts: Excerpt[] = [];
  Array.from(citedPages).sort((a, b) => a - b).forEach(pageNum => {
    docs.forEach(doc => {
      const text = extractPageText(doc.extracted_text, pageNum);
      if (text) excerpts.push({ docName: doc.name, pageNum, text });
    });
  });

  const hasMsgs = messages.some(m => m.role === "assistant");

  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      background: S.panelBg, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        height: 48, display: "flex", alignItems: "center",
        padding: "0 16px", borderBottom: `1px solid ${S.panelBorder}`,
        flexShrink: 0, gap: 8,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: S.textDark }}>
          📎 Sources
        </span>
        {excerpts.length > 0 && (
          <span style={{
            background: S.goldDim, border: `1px solid rgba(255,140,0,0.3)`,
            borderRadius: 20, padding: "1px 8px",
            fontSize: 10, fontWeight: 700, color: S.gold,
          }}>{excerpts.length}</span>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {excerpts.length === 0 ? (
          <div style={{
            height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: 10, textAlign: "center", padding: 24,
          }}>
            <div style={{ fontSize: 28 }}>📎</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: S.textDark }}>
              {hasMsgs ? "No citations yet" : "Citations will appear here"}
            </div>
            <div style={{ fontSize: 11, color: S.textMuted, lineHeight: 1.6, maxWidth: 220 }}>
              {hasMsgs
                ? "The AI hasn't cited specific pages in this conversation yet."
                : "Ask questions in the Chat tab and any page citations will appear here."}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {docs.length > 1 && (
              <div style={{
                padding: "7px 10px", background: S.goldDim,
                border: `1px solid rgba(255,140,0,0.2)`,
                borderRadius: 8, fontSize: 10, color: S.textMid, lineHeight: 1.5,
              }}>
                ℹ️ Multiple documents — showing matching pages from each.
              </div>
            )}
            {excerpts.map((ex, i) => (
              <div key={i} style={{
                background: S.bg, border: `1px solid ${S.panelBorder}`,
                borderRadius: 10, overflow: "hidden",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "8px 12px", background: S.panelBg,
                  borderBottom: `1px solid ${S.panelBorder}`,
                }}>
                  <span style={{
                    background: S.goldDim, border: `1px solid rgba(255,140,0,0.3)`,
                    borderRadius: 5, padding: "2px 7px",
                    fontSize: 10, fontWeight: 700, color: S.gold,
                    fontFamily: "'Montserrat', sans-serif", flexShrink: 0,
                  }}>p.{ex.pageNum}</span>
                  {docs.length > 1 && (
                    <span style={{
                      fontSize: 10, color: S.textMid, fontWeight: 600,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{ex.docName}</span>
                  )}
                </div>
                <div style={{
                  padding: "10px 12px", fontSize: 11,
                  color: S.textMid, lineHeight: 1.7,
                  fontFamily: "'Montserrat', sans-serif",
                }}>
                  {ex.text}
                  {ex.text.length >= 280 && (
                    <span style={{ color: S.textMuted }}>…</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
