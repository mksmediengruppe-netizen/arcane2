// === MAIN LAYOUT — Three-column resizable layout ===
// Design: Refined Dark SaaS — left nav, center chat, right inspector
import { useRef, useCallback, useEffect, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import LeftPanel from "@/components/LeftPanel";
import ChatPanel from "@/components/ChatPanel";
import RightPanel from "@/components/RightPanel";
import DogRacing from "@/components/DogRacing";
import Dashboard from "@/components/Dashboard";
import Settings from "@/components/Settings";
import { PlaybooksView, ScheduleView } from "@/components/Playbooks";
import CommandPalette from "@/components/CommandPalette";
import ShortcutsModal from "@/components/ShortcutsModal";
import ModelsPage from "@/pages/ModelsPage";
import ConsolidationPage from "@/pages/ConsolidationPage";

function ResizeHandle({ onDrag, onDoubleClick }: { onDrag: (dx: number) => void; onDoubleClick?: () => void }) {
  const isDragging = useRef(false);
  const lastX = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    lastX.current = e.clientX;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onDrag(dx);
    };
    const onMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }, [onDrag]);

  return (
    <div onMouseDown={onMouseDown} onDoubleClick={onDoubleClick}
      className="w-1 flex-shrink-0 hover:bg-primary/40 active:bg-primary/60 cursor-col-resize transition-colors group relative"
      style={{ background: "transparent" }}
      title="Двойной клик — сброс ширины">
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}

export default function MainLayout() {
  const { state, dispatch } = useApp();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const handleLeftResize = useCallback((dx: number) => {
    const newWidth = Math.max(180, Math.min(400, state.leftPanelWidth + dx));
    dispatch({ type: "SET_LEFT_WIDTH", width: newWidth });
  }, [state.leftPanelWidth, dispatch]);

  const handleRightResize = useCallback((dx: number) => {
    const newWidth = Math.max(240, Math.min(500, state.rightPanelWidth - dx));
    dispatch({ type: "SET_RIGHT_WIDTH", width: newWidth });
  }, [state.rightPanelWidth, dispatch]);

  const isFullView = ["dog-racing", "dashboard", "settings", "admin", "playbooks", "schedule", "models", "consolidation"].includes(state.activeView);

  // Global keyboard shortcuts
  useEffect(() => {
    const SHORTCUTS: Record<string, { view: string; label: string }> = {
      d: { view: "dashboard",  label: "Дашборды" },
      p: { view: "playbooks",  label: "Плейбуки" },
      u: { view: "admin",      label: "Пользователи" },
      r: { view: "schedule",   label: "Расписание" },
      g: { view: "dog-racing", label: "Dog Racing" },
    };

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.metaKey || e.ctrlKey) {
        const shortcut = SHORTCUTS[e.key.toLowerCase()];
        if (shortcut) {
          e.preventDefault();
          dispatch({ type: "SET_ACTIVE_VIEW", view: shortcut.view as any });
          toast.success(`→ ${shortcut.label}`, { duration: 1500 });
          return;
        }
        // Cmd+B — toggle left panel
        if (e.key === "b") {
          e.preventDefault();
          dispatch({ type: "TOGGLE_LEFT_PANEL" });
          return;
        }
        // Cmd+, — settings
        if (e.key === ",") {
          e.preventDefault();
          dispatch({ type: "SET_ACTIVE_VIEW", view: "settings" });
          toast.success("→ Настройки", { duration: 1500 });
          return;
        }
        // Cmd+K — command palette
        if (e.key === "k") {
          e.preventDefault();
          setCommandPaletteOpen(v => !v);
          return;
        }
        // Cmd+/ — shortcuts modal
        if (e.key === "/") {
          e.preventDefault();
          setShortcutsOpen(v => !v);
          return;
        }
        // Cmd+[ — toggle right panel
        if (e.key === "[") {
          e.preventDefault();
          dispatch({ type: "TOGGLE_RIGHT_PANEL" });
          return;
        }
        // Cmd+N — new task in active project
        if (e.key === "n" && !e.shiftKey) {
          e.preventDefault();
          if (state.activeProjectId) {
            const name = `Новая задача ${new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}`;
            dispatch({ type: "ADD_TASK", projectId: state.activeProjectId, taskName: name });
            toast.success("→ Новая задача создана", { duration: 1500 });
          }
          return;
        }
        // Cmd+Shift+D — toggle theme
        if (e.key === "D" && e.shiftKey) {
          e.preventDefault();
          dispatch({ type: "TOGGLE_THEME" });
          toast.success("Тема переключена", { duration: 1500 });
          return;
        }
      }

      // Escape — back to chat from any full view
      if (e.key === "Escape" && isFullView) {
        dispatch({ type: "SET_ACTIVE_VIEW", view: "chat" });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch, isFullView, state.activeProjectId]);

    return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <CommandPalette open={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {/* Left panel */}
      <LeftPanel />

      {/* Left resize handle */}
      {state.leftPanelOpen && !isFullView && (
        <ResizeHandle onDrag={handleLeftResize} onDoubleClick={() => dispatch({ type: "SET_LEFT_WIDTH", width: 260 })} />
      )}

      {/* Center / Main content */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {state.activeView === "chat" && <ChatPanel />}
        {state.activeView === "dog-racing" && <DogRacing />}
        {state.activeView === "dashboard" && <Dashboard />}
        {state.activeView === "settings" && <Settings />}
        {state.activeView === "admin" && <Settings />}
        {state.activeView === "playbooks" && <PlaybooksView />}
        {state.activeView === "schedule" && <ScheduleView />}
        {state.activeView === "models" && <ModelsPage />}
        {state.activeView === "consolidation" && <ConsolidationPage />}
      </div>

      {/* Right resize handle */}
      {state.rightPanelOpen && state.activeView === "chat" && (
        <ResizeHandle onDrag={handleRightResize} onDoubleClick={() => dispatch({ type: "SET_RIGHT_WIDTH", width: 380 })} />
      )}

      {/* Right panel — only in chat view */}
      {state.activeView === "chat" && <RightPanel />}
    </div>
  );
}
