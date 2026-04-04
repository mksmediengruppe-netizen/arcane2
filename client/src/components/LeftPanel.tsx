// Design: Refined Dark SaaS — compact, monospace costs, color-coded status dots
import { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { getProjectCost, View } from "@/lib/store";
import { formatCostShort, formatCost, type Task, type TaskStatus } from "@/lib/mockData";
import { api } from "@/lib/api";
import { mapBackendModel } from "@/lib/modelMapper";
import {
  FolderOpen, Plus, ChevronDown, ChevronRight,
  LayoutDashboard, Settings, Users, BookOpen,
  Calendar, Moon, Sun, LogOut, Zap, ChevronLeft,
  ChevronUp, HelpCircle, Globe, Download, Search, X,
  MoreHorizontal, Pencil, Trash2, DollarSign, Copy, Pin, Bell, CheckCheck,
  Cpu, Brain, BarChart2, Shield, FileText, UsersRound
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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

const navItems: { icon: React.ReactNode; label: string; view: View; shortcut?: string }[] = [
  { icon: <Cpu size={14} />,             label: "Модели",        view: "models",     shortcut: "⌘M" },
  { icon: <Brain size={14} />,           label: "Консолидация",  view: "consolidation" },
  { icon: <BarChart2 size={14} />,        label: "Аналитика",     view: "analytics",   shortcut: "⌘A" },
  { icon: <BookOpen size={14} />,        label: "Плейбуки",      view: "playbooks",  shortcut: "⌘P" },
  { icon: <Calendar size={14} />,        label: "Расписание",    view: "schedule",   shortcut: "⌘R" },
  { icon: <LayoutDashboard size={14} />, label: "Дашборды",      view: "dashboard",  shortcut: "⌘D" },
  { icon: <Settings size={14} />,        label: "Настройки",     view: "settings",   shortcut: "⇧⌘," },
];

// Admin sub-navigation (visible only to superadmin/admin)
const adminNavItems: { icon: React.ReactNode; label: string; view: View }[] = [
  { icon: <UsersRound size={14} />,   label: "Пользователи",    view: "admin-users" },
  { icon: <Shield size={14} />,       label: "Группы",           view: "admin-groups" },
  { icon: <FileText size={14} />,     label: "Права доступа",   view: "admin-permissions" },
  { icon: <DollarSign size={14} />,   label: "Бюджеты",       view: "admin-budgets" },
  { icon: <BarChart2 size={14} />,    label: "Расходы",          view: "admin-spending" },
  { icon: <FileText size={14} />,     label: "Аудит-лог",       view: "admin-logs" },
];

const MOCK_NOTIFICATIONS = [
  { id: "n1", type: "budget",  title: "Бюджет превышен",   desc: "Проект \"Bitrix сервер\" исчерпал $5.00",   time: "2 мин назад",  read: false },
  { id: "n2", type: "error",   title: "Ошибка задачи",    desc: "Анализ производительности завершился с ошибкой",   time: "15 мин назад", read: false },
  { id: "n3", type: "done",    title: "Задача выполнена",  desc: "Установка SSL завершена за 3m 45s",           time: "1 ч назад",    read: false },
  { id: "n4", type: "info",    title: "Новая модель",       desc: "Claude Opus 4.6 добавлен в список моделей",        time: "3 ч назад",    read: true  },
];

const NOTIF_COLORS: Record<string, string> = {
  budget: "text-yellow-400", error: "text-red-400", done: "text-emerald-400", info: "text-blue-400"
};

const notificationCount = 3;

export default function LeftPanel() {
  const { state, dispatch } = useApp();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set(["p1", "p2"]));
  const [newProjectName, setNewProjectName] = useState("");
  const [showNewProject, setShowNewProject] = useState(false);
  const [newTaskNames, setNewTaskNames] = useState<Record<string, string>>({});
  const [showNewTask, setShowNewTask] = useState<Record<string, boolean>>({});
  const [taskFilter, setTaskFilter] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [navExpanded, setNavExpanded] = useState(false);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragFromProjectId, setDragFromProjectId] = useState<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  // Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "task" | "project"; id: string; projectId?: string; name: string } | null>(null);
  // Budget editing state
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [budgetValue, setBudgetValue] = useState("");
  // Notifications state
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const searchRef = useRef<HTMLInputElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Load projects from backend on mount, then load tasks for each project
  useEffect(() => {
    api.projects.list().then(async res => {
      if (res.projects && res.projects.length > 0) {
        // First pass: map projects with empty tasks
        const mapped = res.projects.map(p => ({
          id: p.id,
          name: p.name,
          tasks: [] as Task[],
          createdAt: new Date(p.created_at * 1000).toISOString().split('T')[0],
          budget: p.budget_limit || undefined,
        }));
        dispatch({ type: 'SET_PROJECTS', projects: mapped });
        // Auto-select first project
        if (mapped.length > 0) {
          dispatch({ type: 'SET_ACTIVE_TASK', projectId: mapped[0].id, taskId: '' });
        }
        // Second pass: load tasks for each project from backend
        const withTasks = await Promise.all(
          mapped.map(async p => {
            try {
              const tr = await api.tasks.list(p.id);
              return {
                ...p,
                tasks: (tr.tasks || []).map(t => ({
                  id: t.run_id,
                  name: t.name,
                  status: (t.status as TaskStatus) || 'done' as TaskStatus,
                  cost: t.cost || 0,
                  duration: t.duration || '—',
                  model: t.model || '—',
                  messages: [],
                  createdAt: t.createdAt ? new Date(t.createdAt * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                })),
              };
            } catch {
              return p; // keep empty tasks on error
            }
          })
        );
        dispatch({ type: 'SET_PROJECTS', projects: withTasks });
      }
    }).catch(() => {
      // Backend not reachable — keep empty state, user can create projects
    });
  }, []);

  // Ctrl+F / Cmd+F focuses search (Cmd+K is reserved for CommandPalette in MainLayout)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f" && !(e.target as HTMLElement)?.closest('input, textarea')) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close popups on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowNotifications(false);
        setNavExpanded(false);
        setSearchQuery("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Flatten all tasks for searchh
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

  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;
    const name = newProjectName.trim();
    try {
      const res = await api.projects.create({ name });
      const p = res.project;
      dispatch({ type: 'SET_PROJECTS', projects: [
        ...state.projects,
        { id: p.id, name: p.name, tasks: [], createdAt: new Date(p.created_at * 1000).toISOString().split('T')[0] }
      ]});
      dispatch({ type: 'SET_ACTIVE_TASK', projectId: p.id, taskId: '' });
    } catch {
      // Fallback: create locally if backend unreachable
      dispatch({ type: "ADD_PROJECT", name });
    }
    setNewProjectName("");
    setShowNewProject(false);
  };

  // ── Rename helpers ──────────────────────────────────────────────────────────
  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
    setTimeout(() => renameInputRef.current?.select(), 30);
  };

  const commitRename = (id: string, isProject: boolean, projectId?: string) => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== "") {
      if (isProject) {
        dispatch({ type: "RENAME_PROJECT", projectId: id, name: trimmed });
      } else if (projectId) {
        dispatch({ type: "RENAME_TASK", projectId, taskId: id, name: trimmed });
      }
    }
    setRenamingId(null);
    setRenameValue("");
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "project") {
      dispatch({ type: "DELETE_PROJECT", projectId: deleteConfirm.id });
      toast.success(`Проект «${deleteConfirm.name}» удалён`);
    } else if (deleteConfirm.projectId) {
      dispatch({ type: "DELETE_TASK", projectId: deleteConfirm.projectId, taskId: deleteConfirm.id });
      toast.success(`Задача «${deleteConfirm.name}» удалена`);
    }
    setDeleteConfirm(null);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string, fromProjectId: string) => {
    setDragTaskId(taskId);
    setDragFromProjectId(fromProjectId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragEnd = () => {
    setDragTaskId(null);
    setDragFromProjectId(null);
    setDragOverProjectId(null);
  };

  const handleProjectDragOver = (e: React.DragEvent, projectId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragFromProjectId && dragFromProjectId !== projectId) {
      setDragOverProjectId(projectId);
    }
  };

  const handleProjectDragLeave = () => {
    setDragOverProjectId(null);
  };

  const handleProjectDrop = (e: React.DragEvent, toProjectId: string) => {
    e.preventDefault();
    if (dragTaskId && dragFromProjectId && dragFromProjectId !== toProjectId) {
      dispatch({ type: "MOVE_TASK", taskId: dragTaskId, fromProjectId: dragFromProjectId, toProjectId });
      // Auto-expand target project
      setExpandedProjects(prev => new Set(Array.from(prev).concat(toProjectId)));
    }
    setDragTaskId(null);
    setDragFromProjectId(null);
    setDragOverProjectId(null);
  };

  const handleAddTask = async (projectId: string) => {
    const name = newTaskNames[projectId]?.trim();
    if (!name) return;
    try {
      await api.chats.create({ title: name, project_id: projectId });
    } catch {
      // fallback: create locally
    }
    dispatch({ type: "ADD_TASK", projectId, taskName: name });
    setNewTaskNames(prev => ({ ...prev, [projectId]: "" }));
    setShowNewTask(prev => ({ ...prev, [projectId]: false }));
  };

  // ── Collapsed state: Manus-style icon rail ───────────────────────────────────────────
  if (!state.leftPanelOpen) {
    return (
      <div className="w-12 flex flex-col items-center py-2 border-r border-border bg-sidebar flex-shrink-0 gap-0.5">
        {/* Logo / reopen button at top */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}
              className="w-8 h-8 rounded-lg bg-primary/15 hover:bg-primary/25 flex items-center justify-center text-primary transition-colors mb-1">
              <Zap size={13} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Открыть панель (⌘B)</TooltipContent>
        </Tooltip>

        {/* Chat / tasks icon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => { dispatch({ type: "TOGGLE_LEFT_PANEL" }); }}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                state.activeView === "chat"
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}>
              <FolderOpen size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Задачи</TooltipContent>
        </Tooltip>

        {/* Nav items as icons */}
        {navItems.map(item => (
          <Tooltip key={item.view}>
            <TooltipTrigger asChild>
              <button
                onClick={() => dispatch({ type: "SET_ACTIVE_VIEW", view: item.view })}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  state.activeView === item.view
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}>
                {item.icon}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        ))}

        {/* Dog Racing */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => dispatch({ type: "SET_ACTIVE_VIEW", view: "dog-racing" })}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors text-[14px] ${
                state.activeView === "dog-racing"
                  ? "bg-primary/15"
                  : "text-muted-foreground hover:bg-accent"
              }`}>
              🐕
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Dog Racing</TooltipContent>
        </Tooltip>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => dispatch({ type: "TOGGLE_THEME" })}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              {state.theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{state.theme === "dark" ? "Светлая тема" : "Тёмная тема"}</TooltipContent>
        </Tooltip>

        {/* Bell with badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowNotifications(true)}
              className="relative w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Bell size={13} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold text-white leading-none">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Уведомления</TooltipContent>
        </Tooltip>

        {/* User avatar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}
              className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary hover:bg-primary/30 transition-colors mt-0.5 mb-1">
              АП
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Алексей Петров</TooltipContent>
        </Tooltip>
      </div>
    );
  }// ── Expanded state ──────────────────────────────────────────────────────────
  return (<>
    <div className="flex flex-col h-full bg-sidebar border-r border-border overflow-hidden select-none"
      style={{ width: state.leftPanelWidth }}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
            <Zap size={12} className="text-primary" />
          </div>
          <span className="font-semibold text-[13px] text-foreground">Arcane AI</span>
        </div>
        <button onClick={() => dispatch({ type: "TOGGLE_LEFT_PANEL" })}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft size={14} />
        </button>
      </div>

      {/* ── Search bar (top, full-width strip) ── */}
      <div className="px-3 pt-2.5 pb-1.5 flex-shrink-0">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-input/50 hover:border-border/80 focus-within:border-primary/40 transition-colors">
          <Search size={12} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={searchRef}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск..."
            className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-muted-foreground outline-none min-w-0"
          />
          {searchQuery.trim().length > 0 && (
            <>
              <span className="mono text-[10px] text-muted-foreground flex-shrink-0">
                {searchResults.length} зад.
              </span>
              <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
                <X size={11} />
              </button>
            </>
          )}
          {searchQuery.trim().length === 0 && (
            <kbd className="text-[9px] text-muted-foreground/60 font-mono flex-shrink-0">⌘F</kbd>
          )}
        </div>
      </div>

      {/* ── Search results dropdown ── */}
      {searchQuery.trim().length > 0 && (
        <div className="mx-3 mb-1 rounded-md border border-border bg-popover shadow-lg overflow-hidden flex-shrink-0">
          {searchResults.length === 0 ? (
            <div className="px-3 py-2.5 text-[11px] text-muted-foreground">Ничего не найдено</div>
          ) : (
            <div className="max-h-44 overflow-y-auto">
              {searchResults.map(task => (
                <button key={task.id}
                  onClick={() => {
                    dispatch({ type: "SET_ACTIVE_TASK", projectId: task.projectId, taskId: task.id });
                    setSearchQuery("");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 transition-colors text-left">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_COLORS[task.status] || "bg-zinc-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[12px] text-foreground truncate">{task.name}</div>
                    <div className="text-[10px] text-muted-foreground">{task.projectName}</div>
                  </div>
                  <span className="mono text-[10px] text-muted-foreground flex-shrink-0">
                    {task.cost !== undefined ? `$${task.cost.toFixed(4)}` : ""}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Projects list ── */}
      <div className="flex-1 overflow-y-auto py-1">
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
            <div key={project.id}
              onDragOver={e => handleProjectDragOver(e, project.id)}
              onDragLeave={handleProjectDragLeave}
              onDrop={e => handleProjectDrop(e, project.id)}
              className={`transition-colors rounded-sm ${dragOverProjectId === project.id ? "bg-primary/10 ring-1 ring-primary/30" : ""}`}>
              <div className={`flex items-center group/proj px-3 py-1.5 hover:bg-accent/50 transition-colors ${isActiveProject ? "bg-accent/30" : ""}`}>
                <button onClick={() => toggleProject(project.id)} className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-muted-foreground flex-shrink-0">{isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
                  <FolderOpen size={13} className="text-muted-foreground flex-shrink-0" />
                  {renamingId === project.id ? (
                    <input ref={renameInputRef} value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => commitRename(project.id, true)}
                      onKeyDown={e => { if (e.key === "Enter") commitRename(project.id, true); if (e.key === "Escape") { setRenamingId(null); } }}
                      onClick={e => e.stopPropagation()}
                      className="flex-1 bg-input border border-primary/50 rounded px-1.5 py-0.5 text-[12px] text-foreground outline-none min-w-0" />
                  ) : (
                    <span className="flex-1 text-left text-[12px] font-medium text-foreground truncate">{project.name}</span>
                  )}
                </button>
                {taskFilter !== "all" && (
                  <span className="mono text-[10px] text-muted-foreground/60 flex-shrink-0 mr-1">{filteredTasks.length}</span>
                )}
                <span className="mono text-[11px] text-muted-foreground flex-shrink-0 mr-1">{formatCostShort(projectCost)}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button onClick={e => e.stopPropagation()}
                      className="opacity-0 group-hover/proj:opacity-100 p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-all flex-shrink-0">
                      <MoreHorizontal size={13} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="w-44">
                    <DropdownMenuItem onClick={() => startRename(project.id, project.name)}>
                      <Pencil size={12} className="mr-2" /> Переименовать
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setEditingBudgetId(project.id); setBudgetValue(project.budget != null ? String(project.budget) : ""); }}>
                      <DollarSign size={12} className="mr-2" /> Бюджет лимит
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setDeleteConfirm({ type: "project", id: project.id, name: project.name })} className="text-destructive focus:text-destructive">
                      <Trash2 size={12} className="mr-2" /> Удалить проект
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Budget progress bar */}
              {project.budget != null && (() => {
                const pct = Math.min((projectCost / project.budget) * 100, 100);
                const isWarn = pct >= 80 && pct < 100;
                const isOver = pct >= 100;
                const barColor = isOver ? "bg-destructive" : isWarn ? "bg-yellow-400" : "bg-primary";
                return (
                  <div className="px-3 pb-1.5">
                    {editingBudgetId === project.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-muted-foreground">$</span>
                        <input
                          autoFocus
                          type="number" min="0" step="0.5"
                          value={budgetValue}
                          onChange={e => setBudgetValue(e.target.value)}
                          onBlur={() => {
                            const v = parseFloat(budgetValue);
                            dispatch({ type: "SET_PROJECT_BUDGET", projectId: project.id, budget: isNaN(v) || v <= 0 ? undefined : v });
                            setEditingBudgetId(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              const v = parseFloat(budgetValue);
                              dispatch({ type: "SET_PROJECT_BUDGET", projectId: project.id, budget: isNaN(v) || v <= 0 ? undefined : v });
                              setEditingBudgetId(null);
                            }
                            if (e.key === "Escape") setEditingBudgetId(null);
                          }}
                          placeholder="0.00"
                          className="w-full bg-input border border-primary/40 rounded px-1.5 py-0.5 text-[11px] text-foreground outline-none mono"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingBudgetId(project.id); setBudgetValue(String(project.budget)); }}
                        className="w-full group/budget"
                        title={`Бюджет: $${project.budget?.toFixed(2)} · Потрачено: $${projectCost.toFixed(2)}`}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-[10px] mono font-medium ${
                            isOver ? "text-destructive" : isWarn ? "text-yellow-500" : "text-muted-foreground"
                          }`}>
                            {isOver ? "⚠ Превышен" : isWarn ? "⚠ 80%+" : "Бюджет"}
                          </span>
                          <span className={`text-[10px] mono ${
                            isOver ? "text-destructive" : isWarn ? "text-yellow-500" : "text-muted-foreground/70"
                          }`}>
                            ${projectCost.toFixed(2)} / ${project.budget?.toFixed(2)}
                          </span>
                        </div>
                        <div className="h-1 w-full bg-border rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor} ${isOver ? "animate-pulse" : ""}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    )}
                  </div>
                );
              })()}

              {isExpanded && (
                <div className="ml-4 border-l border-border/50 pl-2 mb-1">
                  {filteredTasks.map(task => {
                    const isActive = state.activeTaskId === task.id && state.activeProjectId === project.id;
                    const isDragging = dragTaskId === task.id;
                    return (
                      <div key={task.id}
                        draggable
                        onDragStart={e => handleDragStart(e, task.id, project.id)}
                        onDragEnd={handleDragEnd}
                        className={`group/task flex items-start gap-2 px-2 py-2 rounded-md hover:bg-accent/40 transition-all cursor-grab active:cursor-grabbing ${
                          isDragging ? "opacity-40 scale-95" : isActive ? "bg-accent/60" : ""
                        }`}>
                        <button onClick={() => dispatch({ type: "SET_ACTIVE_TASK", projectId: project.id, taskId: task.id })}
                          className="flex items-start gap-2 flex-1 min-w-0 text-left">
                          {task.status === "running" ? (
                            <span className="mt-1 flex-shrink-0 w-3.5 h-3.5 flex items-center justify-center">
                              <span className="block w-3.5 h-3.5 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
                            </span>
                          ) : (
                            <span className={`status-dot mt-1.5 flex-shrink-0 ${STATUS_COLORS[task.status]}`} />
                          )}
                          <div className="flex-1 min-w-0">
                            {renamingId === task.id ? (
                              <input ref={renameInputRef} value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onBlur={() => commitRename(task.id, false, project.id)}
                                onKeyDown={e => { if (e.key === "Enter") commitRename(task.id, false, project.id); if (e.key === "Escape") setRenamingId(null); }}
                                onClick={e => e.stopPropagation()}
                                className="w-full bg-input border border-primary/50 rounded px-1.5 py-0.5 text-[12px] text-foreground outline-none" />
                            ) : (
                              <div className={`text-[12px] truncate leading-tight flex items-center gap-1 ${isActive ? "text-foreground font-medium" : "text-foreground/80"}`}>
                                {task.pinned && (
                                  <Pin size={9} className="flex-shrink-0 text-amber-400 fill-amber-400/30" />
                                )}
                                <span className="truncate">{task.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="mono text-[10px] text-muted-foreground">{formatCost(task.cost)}</span>
                              <span className="text-muted-foreground/40 text-[10px]">·</span>
                              <span className="mono text-[10px] text-muted-foreground">{task.duration}</span>
                            </div>
                          </div>
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button onClick={e => e.stopPropagation()}
                              className="opacity-0 group-hover/task:opacity-100 p-0.5 mt-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-all flex-shrink-0">
                              <MoreHorizontal size={12} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="right" align="start" className="w-44">
                            <DropdownMenuItem onClick={() => startRename(task.id, task.name)}>
                              <Pencil size={12} className="mr-2" /> Переименовать
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { dispatch({ type: "DUPLICATE_TASK", projectId: project.id, taskId: task.id }); }}>
                              <Copy size={12} className="mr-2" /> Дублировать
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { dispatch({ type: "PIN_TASK", projectId: project.id, taskId: task.id }); }}>
                              <Pin size={12} className="mr-2" /> {task.pinned ? "Открепить" : "Закрепить"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDeleteConfirm({ type: "task", id: task.id, projectId: project.id, name: task.name })} className="text-destructive focus:text-destructive">
                              <Trash2 size={12} className="mr-2" /> Удалить задачу
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })}

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

      {/* ── Bottom nav — collapsible list triggered by avatar/arrow ── */}
      <div className="border-t border-border flex-shrink-0">
        {/* Collapsible nav list */}
        {navExpanded && (
          <>
          <div className="fixed inset-0 z-10" onClick={() => setNavExpanded(false)} />
          <div className="py-1 border-b border-border relative z-20">
            {navItems.map(item => (
              <button key={item.view}
                onClick={() => { dispatch({ type: "SET_ACTIVE_VIEW", view: item.view }); setNavExpanded(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors text-left ${
                  state.activeView === item.view ? "text-primary bg-primary/8" : "text-foreground/70 hover:text-foreground"
                }`}>
                <span className={`flex-shrink-0 ${state.activeView === item.view ? "text-primary" : "text-muted-foreground"}`}>
                  {item.icon}
                </span>
                <span className="flex-1 text-[13px]">{item.label}</span>
                {item.shortcut && (
                  <kbd className="text-[10px] text-muted-foreground/50 font-mono">{item.shortcut}</kbd>
                )}
              </button>
            ))}
            {/* Dog Racing */}
            <button
              onClick={() => { dispatch({ type: "SET_ACTIVE_VIEW", view: "dog-racing" }); setNavExpanded(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors text-left ${
                state.activeView === "dog-racing" ? "text-primary bg-primary/8" : "text-foreground/70 hover:text-foreground"
              }`}>
              <span className="text-[14px] flex-shrink-0">🐕</span>
              <span className="flex-1 text-[13px]">Dog Racing</span>
              <kbd className="text-[10px] text-muted-foreground/50 font-mono">⌘G</kbd>
            </button>
            {/* Admin section */}
            <div className="px-4 pt-2 pb-1">
              <div className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-widest">Администрация</div>
            </div>
            {adminNavItems.map(item => (
              <button key={item.view}
                onClick={() => { dispatch({ type: "SET_ACTIVE_VIEW", view: item.view }); setNavExpanded(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent/50 transition-colors text-left ${
                  state.activeView === item.view ? "text-primary bg-primary/8" : "text-foreground/70 hover:text-foreground"
                }`}>
                <span className={`flex-shrink-0 ${
                  state.activeView === item.view ? "text-primary" : "text-muted-foreground"
                }`}>{item.icon}</span>
                <span className="flex-1 text-[13px]">{item.label}</span>
              </button>
            ))}
          </div>
          </>
        )}

        {/* User row — click to toggle nav */}
        <div className="flex items-center justify-between px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-accent/60 transition-colors group min-w-0 flex-1">
                <div className="relative flex-shrink-0">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    АП
                  </div>
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold text-white leading-none">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="text-[12px] font-medium text-foreground truncate">Алексей Петров</div>
                  <div className="text-[10px] text-muted-foreground truncate">Супер-админ</div>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
              <div className="px-3 py-2 border-b border-border">
                <div className="text-[12px] font-medium text-foreground">Алексей Петров</div>
                <div className="text-[11px] text-muted-foreground">alexey@company.ru · Супер-админ</div>
              </div>
              {unreadCount > 0 && (
                <>
                  <DropdownMenuItem onClick={() => setShowNotifications(true)} className="text-amber-500 focus:text-amber-500">
                    <Bell size={13} className="mr-2" />
                    <span>{unreadCount} новых уведомления</span>
                    <span className="ml-auto text-[10px] font-bold bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">{unreadCount}</span>
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

          {/* Bell notifications button */}
          <button
            onClick={() => setShowNotifications(true)}
            className="relative p-1.5 rounded-md hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0"
            title="Уведомления">
            <Bell size={14} />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center text-[8px] font-bold text-white leading-none">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {/* Arrow toggle for nav list */}
          <button
            onClick={() => setNavExpanded(v => !v)}
            className="p-1.5 rounded-md hover:bg-accent/60 transition-colors text-muted-foreground hover:text-foreground flex-shrink-0">
            <ChevronUp size={14} className={`transition-transform duration-200 ${navExpanded ? "" : "rotate-180"}`} />
          </button>
        </div>
      </div>
    </div>

    {/* ── Notifications Panel ── */}
  {showNotifications && (
    <div className="fixed inset-0 z-50 flex items-start justify-start" onClick={() => setShowNotifications(false)}>
      <div className="absolute left-0 top-0 bottom-0 w-[320px] bg-sidebar border-r border-border shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bell size={14} className="text-foreground" />
            <span className="text-[14px] font-semibold text-foreground">Уведомления</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-red-500 text-white rounded-full px-1.5 py-0.5">{unreadCount}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              title="Отметить все прочитанными">
              <CheckCheck size={12} />
            </button>
            <button onClick={() => setShowNotifications(false)}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6">
              <Bell size={24} className="text-muted-foreground/30 mb-2" />
              <div className="text-[13px] text-muted-foreground">Нет уведомлений</div>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map(notif => (
                <div key={notif.id}
                  className={`px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer group ${notif.read ? "opacity-60" : ""}`}
                  onClick={() => setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))}>
                  <div className="flex items-start gap-3">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${notif.read ? "bg-transparent" : "bg-primary"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[12px] font-medium ${NOTIF_COLORS[notif.type]}`}>{notif.title}</span>
                        <button
                          onClick={e => { e.stopPropagation(); setNotifications(prev => prev.filter(n => n.id !== notif.id)); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-400/10 text-muted-foreground hover:text-red-400 transition-all flex-shrink-0">
                          <X size={10} />
                        </button>
                      </div>
                      <div className="text-[11px] text-foreground/70 mt-0.5">{notif.desc}</div>
                      <div className="text-[10px] text-muted-foreground/50 mt-1">{notif.time}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )}

  {/* ── Delete confirmation dialog ── */}
    <AlertDialog open={!!deleteConfirm} onOpenChange={(open: boolean) => !open && setDeleteConfirm(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deleteConfirm?.type === "project" ? "Удалить проект?" : "Удалить задачу?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {deleteConfirm?.type === "project"
              ? `Проект «${deleteConfirm?.name}» и все его задачи будут удалены безвозвратно.`
              : `Задача «${deleteConfirm?.name}» будет удалена безвозвратно.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Отмена</AlertDialogCancel>
          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Удалить
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>);
}
