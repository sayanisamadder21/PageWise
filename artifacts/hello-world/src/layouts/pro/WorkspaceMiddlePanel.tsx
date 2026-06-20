import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabase";
import { extractPDFText } from "../../utils/pdfUtils";
import { S } from "./ProLayout";

const MAX_CHARS = 300_000;

interface Document {
  id: string;
  name: string;
  page_count: number;
  created_at: string;
}

interface WorkspaceMiddlePanelProps {
  activeWorkspace: string;
  isMobile?: boolean;
}

export default function WorkspaceMiddlePanel({ activeWorkspace, isMobile = false }: WorkspaceMiddlePanelProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading]     = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [userId, setUserId]       = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setUserId(session.user.id);
    });
  }, []);

  useEffect(() => {
    if (userId) fetchDocuments();
  }, [userId, activeWorkspace]);

  async function fetchDocuments() {
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("id, name, page_count, created_at")
      .eq("workspace_id", activeWorkspace)
      .order("created_at", { ascending: false });
    if (!error) setDocuments(data || []);
    setLoading(false);
  }

  async function handleFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const { text, pages } = await extractPDFText(file);
      if (text.length > MAX_CHARS) {
        setError(`Document too large (${text.length.toLocaleString()} chars — max 300,000). Try a shorter PDF.`);
        setUploading(false);
        return;
      }
      const { error: dbError } = await supabase.from("documents").insert({
        workspace_id: activeWorkspace,
        user_id: userId,
        name: file.name,
        extracted_text: text,
        page_count: pages,
      });
      if (dbError) {
        setError("Upload failed: " + dbError.message);
      } else {
        fetchDocuments();
      }
    } catch {
      setError("Failed to parse PDF. Please try another file.");
    }
    setUploading(false);
  }

  return (
    <div style={{
      width: isMobile ? "100%" : 320, flexShrink: 0, display: "flex",
      flexDirection: "column", overflow: "hidden", background: S.panelBg,
      borderRight: isMobile ? "none" : `1px solid ${S.panelBorder}`,
    }}>
      <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
        onChange={e => { if (e.target.files?.[0]) { handleFile(e.target.files[0]); e.target.value = ""; } }} />

      {/* Panel header with persistent Upload button */}
      <div style={{
        height: 48, display: "flex", alignItems: "center",
        justifyContent: "space-between", padding: "0 16px",
        borderBottom: `1px solid ${S.panelBorder}`, flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: S.textDark }}>Document</span>
        <button
          onClick={() => !uploading && activeWorkspace && fileRef.current?.click()}
          disabled={uploading || !activeWorkspace}
          style={{
            background: S.gold, border: "none", borderRadius: 7,
            padding: "5px 10px", color: "#fff", fontSize: 10, fontWeight: 700,
            cursor: uploading || !activeWorkspace ? "not-allowed" : "pointer",
            fontFamily: "'Montserrat', sans-serif", opacity: uploading || !activeWorkspace ? 0.6 : 1,
          }}>
          {uploading ? "Parsing…" : "＋ PDF"}
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          margin: "10px 12px 0", padding: "8px 12px",
          background: "#FFF0F0", border: "1px solid #FFCCCC",
          borderRadius: 8, fontSize: 11, color: "#CC2200", lineHeight: 1.5,
        }}>
          {error}
          <span onClick={() => setError(null)}
            style={{ float: "right", cursor: "pointer", fontWeight: 700 }}>✕</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ padding: "16px", fontSize: 11, color: S.textMuted }}>Loading…</div>
      ) : documents.length === 0 ? (
        <div style={{
          flex: 1, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 12, padding: 24, textAlign: "center",
        }}>
          <div style={{ fontSize: 32 }}>📄</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: S.textDark }}>No documents yet</div>
          <div style={{ fontSize: 11, color: S.textMuted, lineHeight: 1.6 }}>
            Upload a PDF to get started.
          </div>
          <button
            onClick={() => !uploading && activeWorkspace && fileRef.current?.click()}
            disabled={uploading || !activeWorkspace}
            style={{
              marginTop: 8, background: S.gold, border: "none",
              borderRadius: 50, padding: "9px 22px", color: "#fff",
              fontSize: 12, fontWeight: 700,
              cursor: uploading || !activeWorkspace ? "not-allowed" : "pointer",
              opacity: !activeWorkspace ? 0.5 : 1,
              fontFamily: "'Montserrat', sans-serif",
              boxShadow: "0 2px 8px rgba(255,140,0,0.25)",
            }}>
            📎 Upload PDF
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
          {documents.map(doc => (
            <div key={doc.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 10px", borderRadius: 8, marginBottom: 4,
              background: S.bg, border: `1px solid ${S.panelBorder}`,
              cursor: "pointer", transition: "border-color 0.15s",
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = S.gold}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = S.panelBorder}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: S.textDark,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{doc.name}</div>
                <div style={{ fontSize: 10, color: S.textMuted, marginTop: 2 }}>
                  {doc.page_count} {doc.page_count === 1 ? "page" : "pages"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
