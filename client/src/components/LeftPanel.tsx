// === LEFT PANEL — Navigation, Projects, Tasks, Billing ===
// Design: Refined Dark SaaS — compact, monospace costs, color-coded status dots
import { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { getProjectCost, View } from "@/lib/store";
import { formatCostShort, formatCost, MOCK_PROJECTS } from "@/lib/mockData";
import {
  FolderOpen, Plus, ChevronDown, ChevronRight,
  LayoutDashboard, Settings, Users, BookOpen,
  Calendar, Moon, Sun, LogOut, Zap, ChevronLeft,
  ChevronUp, HelpCircle, Globe, Download, Search, X
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STATUS_COLORS: Record<string, string> = {
  running: "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.6)]",
  done:    "bg-emerald-400",
  error:   "bg-red-400",
  warning: "bg-yellow-400",
  idle:    "bg-zinc-600",
};

type StatusFilter = "all" | "done" | "error" | "running" | "warning";

const FILTER_OPTIONS: { id: StatusFilter; label: string; dot?: string }[] = [
  { id: "all",     label: "Все" },
  { id: "running", label: "В работе", dot: "bg-blue-400" },
  { id: "done",    label: "Готово",   dot: "bg-emerald-400" },
  { id: "error",   label: "Ошибки",   dot: "bg-red-400" },
  { id: "warning", label: "Внимание", dot: "bg-yellow-400" },
];

export default function LeftPanel() {
  const { state, dispatch } = useApp();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(["p1", "p2"]));
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTaskNames, setNewTaskNames] = useState<Record<string, string>>({});
  const [showNewTask, setShowNewTask] = useState<Record<string, boolean>>({});
  const [taskFilter, setTaskFilter] = useState<StatusFilter>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const notificationCount = 3; // mock: 3 new system events

  // Open search on Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(v => !v);
      }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [searchOpen]);

  // Flatten all tasks for search
  const allTasks = state.projects.flatMap(p =>
    p.tasks.map(t => ({ ...t, projectName: p.name, projectId: p.id }))
  );
  const searchResults = searchQuery.trim().length > 0
    ? allTasks.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.projectName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const toggleProject = (id: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const navItems: { icon: React.ReactNode; label: string; view: View; shortcut?: string }[] = [
    { icon: <BookOpen size={15} />,        label: "Плейбуки",       view: "playbooks",  shortcut: "⌘P" },
    { icon: <Calendar size={15} />,        label: "Расписание",     view: "schedule",   shortcut: "⌘R" },
    { icon: <LayoutDashboard size={15} />, label: "Дашборды",       view: "dashboard",  shortcut: "⌘D" },
    { icon: <Users size={15} />,           label: "Пользователи",  view: "admin",      shortcut: "⌘U" },
    { icon: <Settings size={15} />,        label: "Настройки",      view: "settings",   shortcut: "⇧⌘," },
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

        {/* Global task filter bar */}
        <div className="px-3 pb-2 pt-0.5">
          <div className="flex items-center gap-1 flex-wrap">
            {FILTER_OPTIONS.map(f => {
              const count = f.id === "all"
                ? state.projects.reduce((s, p) => s + p.tasks.length, 0)
                : state.projects.reduce((s, p) => s + p.tasks.filter(t => t.status === f.id).length, 0);
              if (f.id !== "all" && count === 0) return null;
              return (
                <button key={f.id} onClick={() => setTaskFilter(f.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                    taskFilter === f.id
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50 border border-transparent"
                  }`}>
                  {f.dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${f.dot}`} />}
                  {f.label}
                  <span className={`mono ml-0.5 text-[9px] ${taskFilter === f.id ? "text-primary/70" : "text-muted-foreground/50"}`}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {state.projects.map(project => {
          const isExpanded = expandedProjects.has(project.id);
          const projectCost = getProjectCost(state.projects, project.id);
          const isActiveProject = state.activeProjectId === project.id;
          const filteredTasks = taskFilter === "all"
            ? project.tasks
            : project.tasks.filter(t => t.status === taskFilter);
          if (taskFilter !== "all" && filteredTasks.length === 0) return null;

          return (
            <div key={project.id}>
              {/* Project row */}
              <button onClick={() => toggleProject(project.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors group ${isActiveProject ? "bg-accent/30" : ""}`}>
                <span className="text-muted-foreground">{isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
                <FolderOpen size={13} className="text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-left text-[12px] font-medium text-foreground truncate">{project.name}</span>
                {taskFilter !== "all" && (
                  <span className="mono text-[10px] text-muted-foreground/60 flex-shrink-0 mr-1">{filteredTasks.length}</span>
                )}
                <span className="mono text-[11px] text-muted-foreground flex-shrink-0">
                  {formatCostShort(projectCost)}
                </span>
              </button>

              {/* Tasks */}
              {isExpanded && (
                <div className="ml-4 border-l border-border/50 pl-2 mb-1">
                  {filteredTasks.map(task => {
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

      {/* Global search panel */}
      {searchOpen && (
        <div className="absolute bottom-14 left-0 right-0 z-50 mx-2 rounded-lg border border-border bg-popover shadow-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
            <Search size={13} className="text-muted-foreground flex-shrink-0" />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по задачам и проектам..."
              className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground outline-none"
            />
            {searchQuery.trim().length > 0 && (
              <span className="flex-shrink-0 mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                {searchResults.length > 0
                  ? `${searchResults.length} зад.`
                  : "0"}
              </span>
            )}
            <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border font-mono">Esc</kbd>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {searchQuery.trim().length === 0 ? (
              <div className="px-3 py-3 text-[11px] text-muted-foreground">Начните печатать для поиска...</div>
            ) : searchResults.length === 0 ? (
              <div className="px-3 py-3 text-[11px] text-muted-foreground">Ничего не найдено</div>
            ) : (
              searchResults.map(task => (
                <button key={task.id}
                  onClick={() => {
                    dispatch({ type: "SET_ACTIVE_TASK", projectId: task.projectId, taskId: task.id });
                    setSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors text-left">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_COLORS[task.status] || "bg-zinc-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-foreground truncate">{task.name}</div>
                    <div className="text-[10px] text-muted-foreground">{task.projectName}</div>
                  </div>
                  <span className="mono text-[10px] text-muted-foreground flex-shrink-0">{task.cost !== undefined ? `$${task.cost.toFixed(4)}` : ""}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Bottom navigation — compact icon row like Claude */}
      <div className="border-t border-border flex-shrink-0 px-2 py-2 relative">
        <div className="flex items-center justify-between">
          {/* Nav icons with tooltips + hotkeys */}
          <div className="flex items-center gap-0.5">
            {/* Search icon */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSearchOpen(v => !v)}
                  className={`p-2 rounded-md hover:bg-accent/60 transition-colors ${
                    searchOpen ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                  }`}>
                  <Search size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex items-center gap-2">
                <span>Поиск</span>
                <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border font-mono">⌘K</kbd>
              </TooltipContent>
            </Tooltip>

            {navItems.map(item => (
              <Tooltip key={item.view}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => dispatch({ type: "SET_ACTIVE_VIEW", view: item.view })}
                    className={`p-2 rounded-md hover:bg-accent/60 transition-colors ${
                      state.activeView === item.view
                        ? "text-primary bg-primary/10"
                        : "text-muted-foreground hover:text-foreground"
                    }`}>
                    {item.icon}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="flex items-center gap-2">
                  <span>{item.label}</span>
                  {item.shortcut && (
                    <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border font-mono">{item.shortcut}</kbd>
                  )}
                </TooltipContent>
              </Tooltip>
            ))}

            {/* Dog Racing icon */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => dispatch({ type: "SET_ACTIVE_VIEW", view: "dog-racing" })}
                  className={`p-2 rounded-md hover:bg-accent/60 transition-colors text-[14px] leading-none ${
                    state.activeView === "dog-racing" ? "opacity-100 bg-primary/10" : "opacity-60 hover:opacity-100"
                  }`}>
                  🐕
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="flex items-center gap-2">
                <span>Dog Racing</span>
                <kbd className="text-[10px] bg-muted px-1.5 py-0.5 rounded border border-border font-mono">⌘G</kbd>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* User avatar + notification badge + dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 px-1.5 py-1 rounded-md hover:bg-accent/60 transition-colors group relative">
                <div className="relative">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                    АП
                  </div>
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold text-white leading-none">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </div>
                <ChevronUp size={11} className="text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="end" className="w-56 mb-1">
              <div className="px-3 py-2 border-b border-border">
                <div className="text-[12px] font-medium text-foreground">Алексей Петров</div>
                <div className="text-[11px] text-muted-foreground">alexey@company.ru · Супер-админ</div>
              </div>
              {notificationCount > 0 && (
                <>
                  <DropdownMenuItem onClick={() => toast.info(`У вас ${notificationCount} новых события`)} className="text-amber-500 focus:text-amber-500">
                    <span className="mr-2 text-[10px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">{notificationCount}</span>
                    Новые уведомления
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => dispatch({ type: "SET_ACTIVE_VIEW", view: "settings" })}>
                <Settings size={13} className="mr-2" /> Настройки
                <kbd className="ml-auto text-[10px] text-muted-foreground font-mono">⇧⌘,</kbd>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Язык интерфейса")}>
                <Globe size={13} className="mr-2" /> Язык
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Помощь и поддержка")}>
                <HelpCircle size={13} className="mr-2" /> Помощь
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => dispatch({ type: "TOGGLE_THEME" })}>
                {state.theme === "dark"
                  ? <><Sun size={13} className="mr-2" /> Светлая тема</>
                  : <><Moon size={13} className="mr-2" /> Тёмная тема</>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.info("Загрузка приложения")}>
                <Download size={13} className="mr-2" /> Загрузить приложение
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.info("Выход из системы")} className="text-destructive focus:text-destructive">
                <LogOut size={13} className="mr-2" /> Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
