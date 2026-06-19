import { S } from "./ProLayout";

interface WorkspaceMiddlePanelProps {
  activeWorkspace: string;
}

export default function WorkspaceMiddlePanel({ activeWorkspace: _ }: WorkspaceMiddlePanelProps) {
  return (
    <div style={{
      width: 320, flexShrink: 0, display: "flex", flexDirection: "column",
      overflow: "hidden", background: S.panelBg,
      borderRight: `1px solid ${S.panelBorder}`,
    }}>
      <div style={{
        height: 48, display: "flex", alignItems: "center",
        padding: "0 16px", borderBottom: `1px solid ${S.panelBorder}`,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: S.textDark }}>Document</span>
      </div>

      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 12, padding: 24, textAlign: "center",
      }}>
        <div style={{ fontSize: 32 }}>📄</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: S.textDark }}>No document loaded</div>
        <div style={{ fontSize: 11, color: S.textMuted, lineHeight: 1.6 }}>
          Upload a PDF to view its outline and highlights here.
        </div>
        <button style={{
          marginTop: 8, background: S.gold, border: "none",
          borderRadius: 50, padding: "9px 22px",
          color: "#fff", fontSize: 12, fontWeight: 700,
          cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
          boxShadow: "0 2px 8px rgba(255,140,0,0.25)",
        }}>📎 Upload PDF</button>
      </div>
    </div>
  );
}
