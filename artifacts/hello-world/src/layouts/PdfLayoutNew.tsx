import { PERSONAS, ICONS } from "../AppWrapper";

function Icon({
  name,
  size = 14,
  color = "currentColor",
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

function Dots() {
  return (
    <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#f59e0b",
            display: "inline-block",
            animation: `bounce 1.2s ${i * 0.2}s infinite ease-in-out`,
          }}
        />
      ))}
    </span>
  );
}

interface PdfLayoutProps {
  uploading: boolean;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleFile: (file: File) => void;
  fileRef: React.RefObject<HTMLInputElement | null>;
  installPrompt?: any;
  handleInstall?: () => void;
  tier?: any;
  pdfsUplodedToday?: number;
  onLogout?: () => void;
  onNavigate?: (page: "terms" | "privacy") => void;
  // Session resume props
  hasSavedSession?: boolean;
  savedPdfName?: string;
  onResume?: () => void;
  onClearSession?: () => void;
}

export default function PdfLayout({
  uploading,
  dragOver,
  setDragOver,
  handleFile,
  fileRef,
  onNavigate,
  hasSavedSession,
  savedPdfName,
  onResume,
  onClearSession,
}: PdfLayoutProps) {

  // When user clicks "Upload new PDF" — clear session then trigger file picker
  const handleUploadNew = () => {
    onClearSession?.();
    setTimeout(() => fileRef.current?.click(), 50);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#faf7f2",
        fontFamily: "Palatino Linotype, Georgia, serif",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto",
      }}
    >
      <style>{`
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        .drop-zone:hover { border-color:#d97706!important; background:#fffbf2!important; }
        .pill:hover { background:#fef3c7!important; border-color:#f59e0b!important; }
        .footer-link { color:#d97706; text-decoration:none; cursor:pointer; border:none; background:none; font-family:inherit; font-size:inherit; padding:0; }
        .footer-link:hover { text-decoration:underline; }
        .resume-btn:hover { background:#1c1208!important; }
        .new-btn:hover { background:#fef3c7!important; border-color:#d97706!important; }
        * { box-sizing:border-box; }
      `}</style>

      {/* Header */}
      <div
        style={{
          background: "#1c1208",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "2px solid #d97706",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              background: "#d97706",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              color: "#1c1208",
              fontWeight: "bold",
            }}
          >
            P
          </div>
          <div>
            <div style={{ fontSize: 18, color: "#fef3c7", fontWeight: 600 }}>
              PageWise
            </div>
            <div
              style={{
                fontSize: 9,
                color: "#78350f",
                letterSpacing: 3,
                textTransform: "uppercase",
                fontFamily: "monospace",
              }}
            >
              Chat with any PDF
            </div>
          </div>
        </div>
      </div>

      {/* Landing content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 32,
        }}
      >
        <div style={{ maxWidth: 460, width: "100%", textAlign: "center" }}>
          <div
            style={{
              fontSize: 34,
              color: "#1c1208",
              lineHeight: 1.2,
              marginBottom: 10,
              fontWeight: 600,
            }}
          >
            Every document
            <br />
            has a story.
          </div>
          <div
            style={{
              fontSize: 14,
              color: "#92400e",
              marginBottom: 32,
              lineHeight: 1.7,
            }}
          >
            Drop your PDF and start a conversation.
            <br />
            Switch AI modes anytime — no scrolling needed.
          </div>

          {/* ── Session resume UI ── */}
          {hasSavedSession ? (
            <div
              style={{
                background: "#fff",
                border: "1px solid #e8dfc8",
                borderRadius: 16,
                padding: "24px 20px",
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 12, color: "#92400e", marginBottom: 6, fontFamily: "monospace" }}>
                📄 Previous session found
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "#1c1208",
                  fontWeight: 600,
                  marginBottom: 16,
                  wordBreak: "break-word",
                }}
              >
                {savedPdfName || "Unnamed PDF"}
              </div>

              {/* Continue button */}
              <button
                className="resume-btn"
                onClick={onResume}
                style={{
                  width: "100%",
                  background: "#d97706",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "12px 0",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 10,
                  transition: "background 0.15s",
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
                  background: "#faf7f2",
                  color: "#92400e",
                  border: "1px solid #e8dfc8",
                  borderRadius: 10,
                  padding: "11px 0",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                + Upload new PDF
                <span style={{ fontSize: 11, display: "block", color: "#b45309", marginTop: 2 }}>
                  This will clear your previous chat
                </span>
              </button>

              {/* Hidden file input for upload new */}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => e.target.files && handleFile(e.target.files[0])}
              />
            </div>
          ) : (
            /* ── Normal drop zone (no saved session) ── */
            <div
              className="drop-zone"
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? "#d97706" : "#d6c9a8"}`,
                borderRadius: 16,
                padding: "44px 28px",
                cursor: "pointer",
                background: dragOver ? "#fffbf2" : "#fff",
                transition: "all 0.2s",
                marginBottom: 20,
              }}
            >
              {uploading ? (
                <div
                  style={{
                    color: "#d97706",
                    fontSize: 14,
                    fontFamily: "monospace",
                  }}
                >
                  Reading PDF... <Dots />
                </div>
              ) : (
                <div>
                  <div
                    style={{
                      fontSize: 40,
                      marginBottom: 10,
                      color: "#d97706",
                      fontWeight: "bold",
                      fontFamily: "monospace",
                    }}
                  >
                    [PDF]
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      color: "#1c1208",
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    Drop PDF here
                  </div>
                  <div style={{ fontSize: 12, color: "#92400e" }}>
                    or click to browse
                  </div>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                style={{ display: "none" }}
                onChange={(e) => e.target.files && handleFile(e.target.files[0])}
              />
            </div>
          )}

          {/* Uploading indicator when session exists but user picked new PDF */}
          {hasSavedSession && uploading && (
            <div
              style={{
                color: "#d97706",
                fontSize: 14,
                fontFamily: "monospace",
                marginBottom: 12,
              }}
            >
              Reading PDF... <Dots />
            </div>
          )}

          {/* Join Waitlist button */}
          <button
            style={{
              background: "#d97706",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "12px 28px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginBottom: 24,
              width: "100%",
            }}
          >
            🚀 Join Waitlist
          </button>

          {/* Persona cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 16,
            }}
          >
            {PERSONAS.map((p) => (
              <div
                key={p.id}
                style={{
                  background: "#fff",
                  border: "1px solid #e8dfc8",
                  borderRadius: 10,
                  padding: "10px 12px",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <Icon name={p.icon} size={14} color="#d97706" />
                <div>
                  <div
                    style={{ fontSize: 13, color: "#1c1208", fontWeight: 600 }}
                  >
                    {p.label}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#92400e",
                      fontFamily: "monospace",
                    }}
                  >
                    {p.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              fontSize: 11,
              color: "#b45309",
              fontFamily: "monospace",
              marginBottom: 8,
            }}
          >
            Powered by Gemini 2.5 Flash
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 24,
              padding: "20px",
              textAlign: "center",
              borderTop: "1px solid #d97706",
              fontSize: 12,
              color: "#78350f",
            }}
          >
            <p style={{ margin: "0 0 4px", fontWeight: 600 }}>
              © 2026 Saevora. All rights reserved.
            </p>
            <p style={{ margin: "0 0 10px", color: "#92400e" }}>
              AI-generated responses may contain inaccuracies. Verify important
              information independently.
            </p>
            <p style={{ margin: 0 }}>
              <button
                className="footer-link"
                onClick={() => onNavigate?.("terms")}
              >
                Terms &amp; Conditions
              </button>
              <span style={{ margin: "0 8px", color: "#d6c9a8" }}>|</span>
              <button
                className="footer-link"
                onClick={() => onNavigate?.("privacy")}
              >
                Privacy Policy
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}