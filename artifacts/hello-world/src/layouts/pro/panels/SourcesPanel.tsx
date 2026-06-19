import { S } from "../ProLayout";

export default function SourcesPanel() {
  return (
    <div style={{
      height: "100%", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 10, padding: 24, textAlign: "center",
      animation: "fadeIn 0.2s ease",
    }}>
      <div style={{ fontSize: 32 }}>📎</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: S.textDark }}>Sources</div>
      <div style={{ fontSize: 11, color: S.textMuted, lineHeight: 1.6, maxWidth: 240 }}>
        Cited page excerpts and source references from your document will appear here.
      </div>
    </div>
  );
}
