import { S } from "./ProLayout";

const STUB_WORKSPACES = [
  { id: "workspace-1", label: "Research Notes", icon: "🔬" },
  { id: "workspace-2", label: "Contract Review", icon: "📋" },
  { id: "workspace-3", label: "Study Pack",      icon: "📚" },
];

interface WorkspaceSidebarProps {
  activeWorkspace: string;
  onWorkspaceChange: (id: string) => void;
  onLogout: () => void;
  isMobile?: boolean;
}

export default function WorkspaceSidebar({
  activeWorkspace, onWorkspaceChange, onLogout, isMobile = false,
}: WorkspaceSidebarProps) {
  return (
    <div style={{
      width: isMobile ? "100%" : 220, background: S.sidebar, flexShrink: 0,
      display: "flex", flexDirection: "column",
      borderRight: `1px solid ${S.sidebarBorder}`,
    }}>
      {/* Logo + PRO badge */}
      <div style={{
        padding: "16px 16px 12px",
        borderBottom: `1px solid ${S.sidebarBorder}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <img src="/header-logo.png" alt="PageWise"
          style={{ height: 28, objectFit: "contain", filter: "brightness(1.1)" }} />
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: 1.5,
          color: S.sidebarActive,
          background: "rgba(255,140,0,0.12)",
          border: "1px solid rgba(255,140,0,0.25)",
          borderRadius: 4, padding: "2px 6px", textTransform: "uppercase",
        }}>PRO</span>
      </div>

      {/* New Workspace */}
      <div style={{ padding: "12px 12px 4px" }}>
        <button style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", gap: 6,
          background: "rgba(255,140,0,0.10)",
          border: "1px solid rgba(255,140,0,0.22)",
          borderRadius: 10, padding: "8px 0",
          color: S.sidebarActive, fontSize: 11, fontWeight: 700,
          cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
        }}>＋ New Workspace</button>
      </div>

      {/* Workspace list */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: S.textMuted,
          letterSpacing: 1.5, textTransform: "uppercase", padding: "6px 4px 8px",
        }}>Workspaces</div>
        {STUB_WORKSPACES.map(ws => (
          <div key={ws.id} onClick={() => onWorkspaceChange(ws.id)} style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 10px", borderRadius: 8, marginBottom: 2,
            cursor: "pointer",
            background: activeWorkspace === ws.id ? S.sidebarActiveBg : "transparent",
            borderLeft: activeWorkspace === ws.id
              ? `2px solid ${S.sidebarActive}` : "2px solid transparent",
            transition: "background 0.15s",
          }}>
            <span style={{ fontSize: 14 }}>{ws.icon}</span>
            <span style={{
              fontSize: 12,
              fontWeight: activeWorkspace === ws.id ? 700 : 500,
              color: activeWorkspace === ws.id ? S.sidebarActive : S.sidebarText,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>{ws.label}</span>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: "12px", borderTop: `1px solid ${S.sidebarBorder}` }}>
        <div onClick={onLogout} style={{
          textAlign: "center", fontSize: 10, color: "#5A6380",
          cursor: "pointer", fontWeight: 500,
        }}>Log out</div>
      </div>
    </div>
  );
}
