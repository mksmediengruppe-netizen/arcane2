// === MAIN LAYOUT — Three-column resizable layout ===
// Design: Refined Dark SaaS — left nav, center chat, right inspector
import { useRef, useCallback, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import LeftPanel from "@/components/LeftPanel";
import ChatPanel from "@/components/ChatPanel";
import RightPanel from "@/components/RightPanel";
import DogRacing from "@/components/DogRacing";
import Dashboard from "@/components/Dashboard";
import Settings from "@/components/Settings";
import { PlaybooksView, ScheduleView } from "@/components/Playbooks";

function ResizeHandle({ onDrag }: { onDrag: (dx: number) => void }) {
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
    <div onMouseDown={onMouseDown}
      className="w-1 flex-shrink-0 hover:bg-primary/40 active:bg-primary/60 cursor-col-resize transition-colors group relative"
      style={{ background: "transparent" }}>
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}

export default function MainLayout() {
  const { state, dispatch } = useApp();

  const handleLeftResize = useCallback((dx: number) => {
    const newWidth = Math.max(180, Math.min(400, state.leftPanelWidth + dx));
    dispatch({ type: "SET_LEFT_WIDTH", width: newWidth });
  }, [state.leftPanelWidth, dispatch]);

  const handleRightResize = useCallback((dx: number) => {
    const newWidth = Math.max(240, Math.min(500, state.rightPanelWidth - dx));
    dispatch({ type: "SET_RIGHT_WIDTH", width: newWidth });
  }, [state.rightPanelWidth, dispatch]);

  const isFullView = ["dog-racing", "dashboard", "settings", "admin", "playbooks", "schedule"].includes(state.activeView);

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
      }

      // Escape — back to chat from any full view
      if (e.key === "Escape" && isFullView) {
        dispatch({ type: "SET_ACTIVE_VIEW", view: "chat" });
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dispatch, isFullView]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Left panel */}
      <LeftPanel />

      {/* Left resize handle */}
      {state.leftPanelOpen && !isFullView && (
        <ResizeHandle onDrag={handleLeftResize} />
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
      </div>

      {/* Right resize handle */}
      {state.rightPanelOpen && state.activeView === "chat" && (
        <ResizeHandle onDrag={handleRightResize} />
      )}

      {/* Right panel — only in chat view */}
      {state.activeView === "chat" && <RightPanel />}
    </div>
  );
}
