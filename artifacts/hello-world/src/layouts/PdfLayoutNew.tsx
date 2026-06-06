import { C, PERSONAS, ICON_PATHS } from "../AppNew";
import { tierConfig } from "../config/tierConfig";

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

interface PdfLayoutProps {
  uploading: boolean;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleFile: (file: File) => void;
  fileRef: React.RefObject<HTMLInputElement|null>;
  installPrompt: any;
  handleInstall: () => void;
  tier: tierConfig;
  pdfsUplodedToday: number;
}

export default function PdfLayout({
  uploading, dragOver, setDragOver, handleFile, fileRef, installPrompt, handleInstall,
}: PdfLayoutProps) {
  return (
    <div style={{
      minHeight: "100vh",
      background: C.bg,
      fontFamily: "'Montserrat', sans-serif",
      display: "flex",
      flexDirection: "column",
      overflowY: "auto",
    }}>
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        .drop-zone:hover { border-color:${C.orange}!important; background:${C.softBg}!important; }
        * { box-sizing:border-box; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        background: C.dark, padding: "10px 18px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: `2px solid ${C.orange}`, flexShrink: 0,
      }}>
        <img src="/header-logo.png" alt="PageWise"
          style={{ height: 40, width: "auto", display: "block", objectFit: "contain" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          {installPrompt && (
            <button onClick={handleInstall} style={{
              background: C.orange, border: "none", borderRadius: 6,
              padding: "5px 11px", color: C.dark, fontSize: 10,
              cursor: "pointer", fontFamily: "'Montserrat',sans-serif",
              fontWeight: 700, whiteSpace: "nowrap",
            }}>📲 Install</button>
          )}
          {typeof navigator !== "undefined" && !!navigator.share && (
            <button onClick={() => navigator.share({ title: "PageWise", text: "Chat with any PDF using AI", url: window.location.href })}
              style={{
                background: C.orange, border: "none", borderRadius: 6,
                padding: "5px 11px", color: C.dark, fontSize: 10,
                cursor: "pointer", fontFamily: "'Montserrat',sans-serif",
                fontWeight: 700, whiteSpace: "nowrap",
              }}>🔗 Share</button>
          )}
          <a href="https://tally.so/r/yPzqV8" target="_blank" rel="noopener noreferrer"
            style={{
              background: C.orange, border: "none", borderRadius: 6,
              padding: "5px 11px", color: C.dark, fontSize: 10,
              cursor: "pointer", fontFamily: "'Montserrat',sans-serif",
              fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
            }}>🚀 Join Waitlist</a>
        </div>
      </div>

      {/* ── Landing Content ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 32 }}>
        <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 36, color: C.dark, lineHeight: 1.2,
            marginBottom: 10, fontWeight: 700,
          }}>
            Every document<br />has a story.
          </h1>
          <p style={{ fontSize: 14, color: C.textMid, marginBottom: 28, lineHeight: 1.8, fontWeight: 500 }}>
            Drop your PDF and start a conversation.<br />
            Switch AI modes anytime — no scrolling needed.
          </p>

          {/* Drop zone */}
          <div
            className="drop-zone"
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? C.orange : C.muted}`,
              borderRadius: 16, padding: "44px 28px",
              cursor: "pointer",
              background: dragOver ? C.softBg : C.cardBg,
              transition: "all 0.2s", marginBottom: 20,
            }}
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
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
              onChange={e => e.target.files && handleFile(e.target.files[0])} />
          </div>

          {/* Join Waitlist */}
          <a href="https://tally.so/r/yPzqV8" target="_blank" rel="noopener noreferrer"
            style={{
              display: "inline-block", background: C.orange, borderRadius: 8,
              padding: "10px 24px", color: C.dark, fontSize: 13,
              fontWeight: 700, textDecoration: "none", marginBottom: 24,
            }}>
            🚀 Join Waitlist
          </a>

          {/* Mode cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
            {PERSONAS.map(p => (
              <div key={p.id} style={{
                background: C.cardBg, border: `1px solid ${C.border}`,
                borderRadius: 10, padding: "10px 12px",
                textAlign: "left", display: "flex", alignItems: "flex-start", gap: 8,
              }}>
                <div style={{ marginTop: 1 }}><Icon name={p.icon} size={14} color={C.orange} /></div>
                <div>
                  <div style={{ fontSize: 13, color: C.dark, fontWeight: 700 }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: C.textMid, marginTop: 1 }}>{p.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: 1 }}>
            POWERED BY GEMINI 2.5 FLASH
          </div>

          {/* Privacy footer */}
          <div style={{
            marginTop: 28, padding: "20px 0",
            borderTop: `1px solid ${C.border}`,
            fontSize: 12, color: C.textMid, fontWeight: 500,
          }}>
            <p style={{ margin: "0 0 6px" }}>🔒 Your PDFs are never stored. Analyzed and deleted immediately.</p>
            <p style={{ margin: 0 }}>By using PageWise you agree that this is for educational purposes only.</p>
          </div>
        </div>
      </div>
    </div>
  );
}