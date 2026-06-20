import { C, PERSONAS, ICON_PATHS } from "../AppNew";
import { TierConfig } from "../config/tierConfig";

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

// Magic wand icon path for Custom Mode
const MAGIC_ICON = "M12 2l1.5 3.5L17 7l-3.5 1.5L12 12l-1.5-3.5L7 7l3.5-1.5L12 2zM5 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2zM19 14l1 2 2 1-2 1-1 2-1-2-2-1 2-1 1-2z";

interface PdfLayoutProps {
  uploading: boolean;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleFile: (file: File) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  installPrompt: any;
  handleInstall: () => void;
  tier: TierConfig;
  pdfsUplodedToday: number;
  onLogout: () => void;
  onUpgrade?: () => void;
  onNavigate?: (page: "terms" | "privacy") => void;
  // Session resume props
  hasSavedSession?: boolean;
  savedPdfName?: string;
  onResume?: () => void;
  onClearSession?: () => void;
}

export default function PdfLayout({
  uploading, dragOver, setDragOver, handleFile, fileRef,
  installPrompt, handleInstall, tier, pdfsUplodedToday, onLogout, onUpgrade,
  onNavigate,
  hasSavedSession, savedPdfName, onResume, onClearSession,
}: PdfLayoutProps) {

  const handleUploadNew = () => {
    onClearSession?.();
    setTimeout(() => fileRef.current?.click(), 50);
  };

  const pdfsRemaining = tier.pdfsPerDay - pdfsUplodedToday;
  const isNearLimit = pdfsRemaining <= 1;
  const isAtLimit = pdfsRemaining <= 0;

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
        .footer-link { color:${C.orange}; text-decoration:none; cursor:pointer; border:none; background:none; font-family:'Montserrat',sans-serif; font-size:12px; font-weight:600; padding:0; }
        .footer-link:hover { text-decoration:underline; }
        .resume-btn:hover { opacity:0.88; }
        .new-btn:hover { background:${C.softBg}!important; border-color:${C.orange}!important; }
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
          <button onClick={onUpgrade} style={{
            background: C.orange, border: "none", borderRadius: 6,
            padding: "5px 11px", color: C.dark, fontSize: 10,
            cursor: "pointer", fontFamily: "'Montserrat',sans-serif",
            fontWeight: 700, whiteSpace: "nowrap",
          }}>⚡ Upgrade</button>
          <button onClick={onLogout} style={{
            background: "transparent",
            border: `1px solid ${C.orange}`,
            borderRadius: 6,
            padding: "5px 11px",
            color: C.orange,
            fontSize: 10,
            cursor: "pointer",
            fontFamily: "'Montserrat',sans-serif",
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}>Log out</button>
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

          {/* ── PDF Usage Indicator ── */}
          {tier.pdfsPerDay !== -1 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: isAtLimit ? "#FFF0F0" : isNearLimit ? "#FFF8F0" : C.cardBg,
              border: `1px solid ${isAtLimit ? "#FFCCCC" : isNearLimit ? C.orange : C.border}`,
              borderRadius: 10,
              padding: "8px 14px",
              marginBottom: 12,
            }}>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: isAtLimit ? "#CC0000" : isNearLimit ? C.orange : C.textMid,
                fontFamily: "'Montserrat', sans-serif",
              }}>
                {isAtLimit
                  ? "⚠️ Daily PDF limit reached"
                  : `📄 ${pdfsUplodedToday} / ${tier.pdfsPerDay} PDFs used today`}
              </span>
              <div style={{
                display: "flex", gap: 3,
              }}>
                {Array.from({ length: tier.pdfsPerDay }).map((_, i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: i < pdfsUplodedToday
                      ? (isAtLimit ? "#CC0000" : C.orange)
                      : C.border,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* ── Session resume UI OR normal drop zone ── */}
          {hasSavedSession ? (
            <div style={{
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: "24px 20px",
              marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, color: C.textMid, marginBottom: 6, fontWeight: 600, letterSpacing: 1 }}>
                📄 PREVIOUS SESSION FOUND
              </div>
              <div style={{
                fontSize: 13, color: C.dark, fontWeight: 700,
                marginBottom: 16, wordBreak: "break-word",
              }}>
                {savedPdfName || "Unnamed PDF"}
              </div>

              {/* Continue button */}
              <button
                className="resume-btn"
                onClick={onResume}
                style={{
                  width: "100%",
                  background: C.orange,
                  color: C.dark,
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 0",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  marginBottom: 10,
                  fontFamily: "'Montserrat',sans-serif",
                  transition: "opacity 0.15s",
                }}
              >
                ↩ Continue last chat
              </button>

              {/* Upload new button */}
              <button
                className="new-btn"
                onClick={handleUploadNew}
                style={{
                  width: "100%",
                  background: C.bg,
                  color: C.textMid,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "11px 0",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "'Montserrat',sans-serif",
                  transition: "all 0.15s",
                }}
              >
                + Upload new PDF
                <span style={{ fontSize: 10, display: "block", color: C.muted, marginTop: 2, fontWeight: 500 }}>
                  This will clear your previous chat
                </span>
              </button>

              {/* Hidden file input */}
              <input ref={fileRef} type="file" accept=".pdf" style={{ display: "none" }}
                onChange={e => e.target.files && handleFile(e.target.files[0])} />
            </div>
          ) : (
            /* ── Normal drop zone ── */
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
          )}

          {/* Uploading indicator when resuming session and new PDF picked */}
          {hasSavedSession && uploading && (
            <div style={{ color: C.orange, fontSize: 13, marginBottom: 12 }}>
              Reading PDF... <Dots />
            </div>
          )}

          <button onClick={onUpgrade} style={{
            display: "block", background: C.orange, border: "none", borderRadius: 8,
            padding: "10px 24px", color: C.dark, fontSize: 13,
            fontWeight: 700, cursor: "pointer",
            fontFamily: "'Montserrat',sans-serif", marginBottom: 24,
          }}>⚡ Upgrade</button>

          {/* ── Mode cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            {PERSONAS.map(p => {
              const isLocked = ["studynotes", "examgen"].includes(p.id);
              return (
                <div key={p.id} style={{
                  background: C.cardBg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  opacity: isLocked ? 0.6 : 1,
                  position: "relative",
                }}>
                  <div style={{ marginTop: 1 }}>
                    <Icon name={p.icon} size={14} color={isLocked ? C.muted : C.orange} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: C.dark, fontWeight: 700 }}>
                      {p.label} {isLocked && "🔒"}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMid, marginTop: 1 }}>
                      {isLocked ? "Starter & Pro" : p.desc}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ── Custom Mode — locked, Pro, coming soon ── */}
            <div style={{
              background: C.cardBg,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: "10px 12px",
              textAlign: "left",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              opacity: 0.5,
              position: "relative",
              gridColumn: "1 / -1",
            }}>
              <div style={{ marginTop: 1, flexShrink: 0 }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none"
                  stroke={C.muted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d={MAGIC_ICON} />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.dark, fontWeight: 700 }}>
                  Custom Mode 🔒
                </div>
                <div style={{ fontSize: 11, color: C.textMid, marginTop: 1 }}>
                  Build your own AI persona — Pro only
                </div>
              </div>
              <div style={{
                position: "absolute",
                top: 8,
                right: 10,
                background: C.softBg,
                border: `1px solid ${C.border}`,
                borderRadius: 20,
                padding: "2px 8px",
                fontSize: 9,
                color: C.textMid,
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: "uppercase",
              }}>
                Coming Soon
              </div>
            </div>
          </div>

          <div style={{ fontSize: 10, color: C.muted, fontWeight: 600, letterSpacing: 1, marginTop: 8, marginBottom: 4 }}>
            POWERED BY GEMINI 2.5 FLASH
          </div>

          {/* ── Footer ── */}
          <div style={{
            marginTop: 28, padding: "20px 0",
            borderTop: `1px solid ${C.border}`,
            fontSize: 12, color: C.textMid, fontWeight: 500,
          }}>
            <p style={{ margin: "0 0 4px", fontWeight: 700, color: C.dark }}>
              © 2026 Saevora. All rights reserved.
            </p>
            <p style={{ margin: "0 0 10px" }}>
              🔒 Your PDFs are never sold or shared. Processed securely to power your conversation.
            </p>
            <p style={{ margin: "0 0 10px" }}>
              AI-generated responses may contain inaccuracies. Verify important information independently.
            </p>
            <p style={{ margin: 0 }}>
              <button className="footer-link" onClick={() => onNavigate?.("terms")}>
                Terms &amp; Conditions
              </button>
              <span style={{ margin: "0 8px", color: C.muted }}>|</span>
              <button className="footer-link" onClick={() => onNavigate?.("privacy")}>
                Privacy Policy
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}