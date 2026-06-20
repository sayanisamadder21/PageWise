import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { S } from "./ProLayout";

interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

interface WorkspaceSidebarProps {
  activeWorkspace: string;
  onWorkspaceChange: (id: string) => void;
  onLogout: () => void;
  isMobile?: boolean;
}

export default function WorkspaceSidebar({
  activeWorkspace, onWorkspaceChange, onLogout, isMobile = false,
}: WorkspaceSidebarProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading]       = useState(true);
  const [creating, setCreating]     = useState(false);
  const [newName, setNewName]       = useState("");
  const [userId, setUserId]         = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      setUserId(session.user.id);
      fetchWorkspaces(session.user.id);
    });
  }, []);

  async function fetchWorkspaces(uid: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("workspaces")
      .select("id, name, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: true });
    if (!error) {
      setWorkspaces(data || []);
      if (data && data.length > 0) onWorkspaceChange(data[0].id);
    }
    setLoading(false);
  }

  async function handleCreate() {
    if (!userId) return;
    const name = newName.trim() || "Untitled Workspace";
    const { error } = await supabase
      .from("workspaces")
      .insert({ user_id: userId, name });
    if (!error) {
      setCreating(false);
      setNewName("");
      fetchWorkspaces(userId);
    }
  }

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

      {/* New Workspace / inline create input */}
      <div style={{ padding: "12px 12px 4px" }}>
        {creating ? (
          <div style={{ display: "flex", gap: 4 }}>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter")  handleCreate();
                if (e.key === "Escape") { setCreating(false); setNewName(""); }
              }}
              placeholder="Workspace name…"
              style={{
                flex: 1, background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,140,0,0.35)",
                borderRadius: 7, padding: "6px 8px",
                color: "#fff", fontSize: 11, outline: "none",
                fontFamily: "'Montserrat', sans-serif",
              }}
            />
            <button onClick={handleCreate} style={{
              background: S.sidebarActive, border: "none", borderRadius: 7,
              padding: "6px 10px", color: "#fff", fontSize: 11, fontWeight: 700,
              cursor: "pointer", fontFamily: "'Montserrat', sans-serif", flexShrink: 0,
            }}>✓</button>
            <button onClick={() => { setCreating(false); setNewName(""); }} style={{
              background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 7, padding: "6px 8px", color: S.textMuted,
              fontSize: 11, cursor: "pointer", flexShrink: 0,
            }}>✕</button>
          </div>
        ) : (
          <button onClick={() => setCreating(true)} style={{
            width: "100%", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6,
            background: "rgba(255,140,0,0.10)",
            border: "1px solid rgba(255,140,0,0.22)",
            borderRadius: 10, padding: "8px 0",
            color: S.sidebarActive, fontSize: 11, fontWeight: 700,
            cursor: "pointer", fontFamily: "'Montserrat', sans-serif",
          }}>＋ New Workspace</button>
        )}
      </div>

      {/* Workspace list */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "8px 10px" }}>
        <div style={{
          fontSize: 9, fontWeight: 700, color: S.textMuted,
          letterSpacing: 1.5, textTransform: "uppercase", padding: "6px 4px 8px",
        }}>Workspaces</div>

        {loading ? (
          <div style={{ padding: "12px 4px", fontSize: 11, color: S.textMuted }}>
            Loading…
          </div>
        ) : workspaces.length === 0 ? (
          <div style={{
            padding: "12px 4px", fontSize: 11, color: S.textMuted,
            lineHeight: 1.6, fontStyle: "italic",
          }}>
            No workspaces yet —<br />create one to get started.
          </div>
        ) : (
          workspaces.map(ws => (
            <div key={ws.id} onClick={() => onWorkspaceChange(ws.id)} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 10px", borderRadius: 8, marginBottom: 2,
              cursor: "pointer",
              background: activeWorkspace === ws.id ? S.sidebarActiveBg : "transparent",
              borderLeft: activeWorkspace === ws.id
                ? `2px solid ${S.sidebarActive}` : "2px solid transparent",
              transition: "background 0.15s",
            }}>
              <span style={{ fontSize: 14 }}>📁</span>
              <span style={{
                fontSize: 12,
                fontWeight: activeWorkspace === ws.id ? 700 : 500,
                color: activeWorkspace === ws.id ? S.sidebarActive : S.sidebarText,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{ws.name}</span>
            </div>
          ))
        )}
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
