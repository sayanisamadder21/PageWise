import { useState } from "react";
import WorkspaceSidebar from "./WorkspaceSidebar";
import WorkspaceMiddlePanel from "./WorkspaceMiddlePanel";
import ChatPanel from "./panels/ChatPanel";
import SourcesPanel from "./panels/SourcesPanel";

export const S = {
  sidebar:         "#0F1117",
  sidebarBorder:   "#1C2030",
  sidebarText:     "#8A94AF",
  sidebarActive:   "#FF8C00",
  sidebarActiveBg: "rgba(255,140,0,0.10)",
  sidebarHover:    "rgba(255,255,255,0.04)",
  bg:              "#F5F6FA",
  panelBg:         "#FFFFFF",
  panelBorder:     "#E3E7F0",
  headerBg:        "#FFFFFF",
  headerBorder:    "#E3E7F0",
  gold:            "#FF8C00",
  goldDim:         "rgba(255,140,0,0.12)",
  textDark:        "#1A1D2E",
  textMid:         "#5A6380",
  textMuted:       "#9BA3BF",
  shadow:          "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.05)",
};

type PanelTab = "chat" | "sources";

interface ProLayoutProps {
  onLogout: () => void;
}

export default function ProLayout({ onLogout }: ProLayoutProps) {
  const [activeWorkspace, setActiveWorkspace] = useState("workspace-1");
  const [activePanelTab, setActivePanelTab]   = useState<PanelTab>("chat");

  return (
    <div style={{
      display: "flex", height: "100dvh", overflow: "hidden",
      fontFamily: "'Montserrat', sans-serif", background: S.bg,
    }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <WorkspaceSidebar
        activeWorkspace={activeWorkspace}
        onWorkspaceChange={setActiveWorkspace}
        onLogout={onLogout}
      />

      <WorkspaceMiddlePanel activeWorkspace={activeWorkspace} />

      {/* Right: tabbed Chat / Sources */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        overflow: "hidden", background: S.panelBg,
        borderLeft: `1px solid ${S.panelBorder}`,
      }}>
        {/* Tab bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 2,
          padding: "0 16px", height: 48, flexShrink: 0,
          borderBottom: `1px solid ${S.panelBorder}`,
          background: S.headerBg,
        }}>
          {(["chat", "sources"] as PanelTab[]).map(tab => (
            <button key={tab} onClick={() => setActivePanelTab(tab)} style={{
              background: "none", border: "none",
              borderBottom: activePanelTab === tab
                ? `2px solid ${S.gold}` : "2px solid transparent",
              padding: "0 14px", height: "100%", cursor: "pointer",
              fontSize: 12, fontWeight: activePanelTab === tab ? 700 : 500,
              color: activePanelTab === tab ? S.textDark : S.textMuted,
              fontFamily: "'Montserrat', sans-serif",
              transition: "color 0.15s",
            }}>
              {tab === "chat" ? "💬 Chat" : "📎 Sources"}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "hidden" }}>
          {activePanelTab === "chat" ? <ChatPanel /> : <SourcesPanel />}
        </div>
      </div>
    </div>
  );
}
