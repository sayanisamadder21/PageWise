import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import WorkspaceSidebar from "./WorkspaceSidebar";
import WorkspaceMiddlePanel from "./WorkspaceMiddlePanel";
import ChatPanel from "./panels/ChatPanel";
import type { Message } from "./panels/ChatPanel";
import SourcesPanel from "./panels/SourcesPanel";

interface Workspace { id: string; name: string; created_at: string; }

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

type PanelTab  = "chat" | "sources";
type MobileTab = "workspaces" | "document" | "chat";

interface ProLayoutProps {
  onLogout: () => void;
}

export default function ProLayout({ onLogout }: ProLayoutProps) {
  const [activeWorkspace, setActiveWorkspace] = useState("");
  const [activePanelTab, setActivePanelTab]   = useState<PanelTab>("chat");
  const [isMobile, setIsMobile]               = useState(() => window.innerWidth < 768);
  const [activeMobileTab, setActiveMobileTab] = useState<MobileTab>("chat");
  const [messages, setMessages]               = useState<Message[]>([]);
  const [workspaces, setWorkspaces]           = useState<Workspace[]>([]);
  const [workspacesLoading, setWorkspacesLoading] = useState(true);
  const [userId, setUserId]                   = useState<string | null>(null);

  useEffect(() => { setMessages([]); }, [activeWorkspace]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setUserId(session.user.id);
      fetchWorkspaces(session.user.id);
    });
  }, []);

  async function fetchWorkspaces(uid: string) {
    setWorkspacesLoading(true);
    const { data, error } = await supabase
      .from("workspaces")
      .select("id, name, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    if (!error) {
      setWorkspaces(data || []);
      if (data && data.length > 0)
        setActiveWorkspace(prev => prev || data[0].id);
    }
    setWorkspacesLoading(false);
  }

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return (
    <div style={{
      display: "flex", flexDirection: isMobile ? "column" : "row",
      height: "100dvh", overflow: "hidden",
      fontFamily: "'Montserrat', sans-serif", background: S.bg,
    }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Panels area — all three on desktop, one at a time on mobile */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {(!isMobile || activeMobileTab === "workspaces") && (
          <WorkspaceSidebar
            activeWorkspace={activeWorkspace}
            onWorkspaceChange={setActiveWorkspace}
            onLogout={onLogout}
            isMobile={isMobile}
            workspaces={workspaces}
            workspacesLoading={workspacesLoading}
            userId={userId}
            onWorkspaceCreated={() => userId && fetchWorkspaces(userId)}
          />
        )}

        {(!isMobile || activeMobileTab === "document") && (
          <WorkspaceMiddlePanel activeWorkspace={activeWorkspace} isMobile={isMobile} />
        )}

        {(!isMobile || activeMobileTab === "chat") && (
          <div style={{
            flex: 1, display: "flex", flexDirection: "column",
            overflow: "hidden", background: S.panelBg,
            borderLeft: isMobile ? "none" : `1px solid ${S.panelBorder}`,
          }}>
            {/* Chat / Sources tab bar */}
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

            <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", inset: 0, display: activePanelTab === "chat" ? "flex" : "none", flexDirection: "column" }}>
                <ChatPanel activeWorkspace={activeWorkspace} userId={userId} onMessagesChange={setMessages} />
              </div>
              <div style={{ position: "absolute", inset: 0, display: activePanelTab === "sources" ? "flex" : "none", flexDirection: "column" }}>
                <SourcesPanel messages={messages} activeWorkspace={activeWorkspace} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom tab bar — mobile only */}
      {isMobile && (
        <div style={{
          display: "flex", flexShrink: 0, height: 56,
          background: S.panelBg, borderTop: `1px solid ${S.panelBorder}`,
        }}>
          {([
            { id: "workspaces", label: "Workspaces", icon: "📁" },
            { id: "document",   label: "Document",   icon: "📄" },
            { id: "chat",       label: "Chat",       icon: "💬" },
          ] as { id: MobileTab; label: string; icon: string }[]).map(tab => (
            <button key={tab.id} onClick={() => setActiveMobileTab(tab.id)} style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 3,
              background: "none", border: "none", cursor: "pointer",
              borderTop: activeMobileTab === tab.id
                ? `2px solid ${S.gold}` : "2px solid transparent",
            }}>
              <span style={{ fontSize: 18 }}>{tab.icon}</span>
              <span style={{
                fontSize: 9, fontWeight: activeMobileTab === tab.id ? 700 : 500,
                color: activeMobileTab === tab.id ? S.gold : S.textMuted,
                fontFamily: "'Montserrat', sans-serif",
                letterSpacing: 0.3, textTransform: "uppercase",
              }}>{tab.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
