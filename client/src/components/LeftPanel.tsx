// === LEFT PANEL — Navigation, Projects, Tasks, Billing ===
// Design: Refined Dark SaaS — compact, monospace costs, color-coded status dots
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { getProjectCost, View } from "@/lib/store";
import { formatCostShort, formatCost, MOCK_PROJECTS } from "@/lib/mockData";
import {
  FolderOpen, Plus, ChevronDown, ChevronRight,
  LayoutDashboard, Settings, Users, BookOpen,
  Calendar, Moon, Sun, LogOut, Zap, ChevronLeft
} from "lucide-react";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  running: "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.6)]",
  done:    "bg-emerald-400",
  error:   "bg-red-400",
  warning: "bg-yellow-400",
  idle:    "bg-zinc-600",
};

export default function LeftPanel() {
  const { state, dispatch } = useApp();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(["p1", "p2"]));
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTaskNames, setNewTaskNames] = useState<Record<string, string>>({});
  const [showNewTask, setShowNewTask] = useState<Record<string, boolean>>({});

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const navItems: { icon: React.ReactNode; label: string; view: View }[] = [
    { icon: <BookOpen size={15} />,      label: "Плейбуки",  view: "playbooks" },
    { icon: <Calendar size={15} />,      label: "Расписание", view: "schedule" },
    { icon: <LayoutDashboard size={15} />, label: "Дашборды", view: "dashboard" },
    { icon: <Users size={15} />,         label: "Пользователи", view: "admin" },
    { icon: <Settings size={15} />,      label: "Настройки", view: "settings" },
  ];

  const handleAddProject = () => {
    if (!newProjectName.trim()) return;
    dispatch({ type: "ADD_PROJECT", name: newProjectName.trim() });
    setNewProjectName("");
    setShowNewProject(false);
  };

  const handleAddTask = (projectId: string) => {
    const name = newTaskNames[projectId]?.trim();
    if (!name) return;
    dispatch({ type: "ADD_TASK", projectId, taskName: name });
    setNewTaskNames(prev => ({ ...prev, [projectId]: "" }));
    setShowNewTask(prev => ({ ...prev, [projectId]: false }));
  };

  if (!state.leftPanelOpen) {
    return (
      <div className="w-12 flex flex-col items-center py-3 gap-3 border-r border-border bg-sidebar flex-shrink-0">
        <button onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}
          className="p-2 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight size={14} />
        </button>
        {navItems.map(item => (
          <button key={item.view} onClick={() => dispatch({ type: "SET_ACTIVE_VIEW", view: item.view })}
            className={`p-2 rounded hover:bg-accent transition-colors ${state.activeView === item.view ? "text-primary" : "text-muted-foreground"}`}>
            {item.icon}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-border overflow-hidden select-none"
      style={{ width: state.leftPanelWidth }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
            <Zap size={12} className="text-primary" />
          </div>
          <span className="font-semibold text-[13px] text-foreground">Arcane 2</span>
        </div>
        <button onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* Projects list */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Projects header */}
        <div className="flex items-center justify-between px-4 py-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground tracking-widest uppercase">Проекты</span>
          <button onClick={() => setShowNewProject(v => !v)}
            className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <Plus size={13} />
          </button>
        </div>

        {showNewProject && (
          <div className="px-3 pb-2">
            <input autoFocus value={newProjectName} onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleAddProject(); if (e.key === "Escape") setShowNewProject(false); }}
              placeholder="Название проекта..."
              className="w-full bg-input border border-border rounded px-2 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50" />
          </div>
        )}

        {state.projects.map(project => {
          const isExpanded = expandedProjects.has(project.id);
          const projectCost = getProjectCost(state.projects, project.id);
          const isActiveProject = state.activeProjectId === project.id;

          return (
            <div key={project.id}>
              {/* Project row */}
              <button onClick={() => toggleProject(project.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors group ${isActiveProject ? "bg-accent/30" : ""}`}>
                <span className="text-muted-foreground">{isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
                <FolderOpen size={13} className="text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-left text-[12px] font-medium text-foreground truncate">{project.name}</span>
                <span className="mono text-[11px] text-muted-foreground flex-shrink-0">
                  {formatCostShort(projectCost)}
                </span>
              </button>

              {/* Tasks */}
              {isExpanded && (
                <div className="ml-4 border-l border-border/50 pl-2 mb-1">
                  {project.tasks.map(task => {
                    const isActive = state.activeTaskId === task.id && state.activeProjectId === project.id;
                    return (
                      <button key={task.id}
                        onClick={() => dispatch({ type: "SET_ACTIVE_TASK", projectId: project.id, taskId: task.id })}
                        className={`w-full flex items-start gap-2 px-2 py-2 rounded-md hover:bg-accent/40 transition-colors text-left group ${isActive ? "bg-accent/60" : ""}`}>
                        <span className={`status-dot mt-1.5 flex-shrink-0 ${STATUS_COLORS[task.status]}`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-[12px] truncate leading-tight ${isActive ? "text-foreground font-medium" : "text-foreground/80"}`}>
                            {task.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="mono text-[10px] text-muted-foreground">{formatCost(task.cost)}</span>
                            <span className="text-muted-foreground/40 text-[10px]">·</span>
                            <span className="mono text-[10px] text-muted-foreground">{task.duration}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}

                  {/* Add task */}
                  {showNewTask[project.id] ? (
                    <div className="px-2 py-1">
                      <input autoFocus value={newTaskNames[project.id] || ""}
                        onChange={e => setNewTaskNames(prev => ({ ...prev, [project.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === "Enter") handleAddTask(project.id); if (e.key === "Escape") setShowNewTask(prev => ({ ...prev, [project.id]: false })); }}
                        placeholder="Название задачи..."
                        className="w-full bg-input border border-border rounded px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50" />
                    </div>
                  ) : (
                    <button onClick={() => setShowNewTask(prev => ({ ...prev, [project.id]: true }))}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                      <Plus size={11} />
                      <span>Новая задача</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom navigation */}
      <div className="border-t border-border flex-shrink-0">
        {navItems.map(item => (
          <button key={item.view}
            onClick={() => dispatch({ type: "SET_ACTIVE_VIEW", view: item.view })}
            className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors text-[12px] ${state.activeView === item.view ? "text-primary bg-primary/5" : "text-muted-foreground"}`}>
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}

        {/* Dog Racing */}
        <button onClick={() => dispatch({ type: "SET_ACTIVE_VIEW", view: "dog-racing" })}
          className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors text-[12px] ${state.activeView === "dog-racing" ? "text-primary bg-primary/5" : "text-muted-foreground"}`}>
          <span className="text-[13px]">🐕</span>
          <span>Dog Racing</span>
        </button>

        {/* User row */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
            АП
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-foreground truncate">Алексей Петров</div>
            <div className="text-[10px] text-muted-foreground">Супер-админ</div>
          </div>
          <button onClick={() => dispatch({ type: "TOGGLE_THEME" })}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            {state.theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          </button>
          <button onClick={() => toast.info("Выход из системы")}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
