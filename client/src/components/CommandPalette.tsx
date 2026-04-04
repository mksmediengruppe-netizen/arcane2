// Design: Refined Dark SaaS — Command Palette (Cmd+K)
// Global command palette for quick access to all app functions
import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { MODELS } from "@/lib/mockData";
import {
  Search, MessageSquare, FolderOpen, Zap, Settings, LayoutDashboard,
  BookOpen, Calendar, Dog, Users, ChevronRight, Hash, Cpu, X
} from "lucide-react";
import { toast } from "sonner";

type CommandItem = {
  id: string;
  icon: React.ReactNode;
  label: string;
  description?: string;
  category: string;
  action: () => void;
  shortcut?: string;
};

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { state, dispatch } = useApp();
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Build command list
  const commands: CommandItem[] = [
    // Navigation
    {
      id: "nav-chat", icon: <MessageSquare size={14} />, label: "Перейти в чат",
      category: "Навигация", shortcut: "Esc",
      action: () => { dispatch({ type: "SET_ACTIVE_VIEW", view: "chat" }); onClose(); }
    },
    {
      id: "nav-dashboard", icon: <LayoutDashboard size={14} />, label: "Дашборды",
      category: "Навигация", shortcut: "⌘D",
      action: () => { dispatch({ type: "SET_ACTIVE_VIEW", view: "dashboard" }); onClose(); }
    },
    {
      id: "nav-playbooks", icon: <BookOpen size={14} />, label: "Плейбуки",
      category: "Навигация", shortcut: "⌘P",
      action: () => { dispatch({ type: "SET_ACTIVE_VIEW", view: "playbooks" }); onClose(); }
    },
    {
      id: "nav-schedule", icon: <Calendar size={14} />, label: "Расписание",
      category: "Навигация", shortcut: "⌘R",
      action: () => { dispatch({ type: "SET_ACTIVE_VIEW", view: "schedule" }); onClose(); }
    },
    {
      id: "nav-users", icon: <Users size={14} />, label: "Пользователи",
      category: "Навигация", shortcut: "⌘U",
      action: () => { dispatch({ type: "SET_ACTIVE_VIEW", view: "admin-users" }); onClose(); }
    },
    {
      id: "nav-settings", icon: <Settings size={14} />, label: "Настройки",
      category: "Навигация", shortcut: "⌘,",
      action: () => { dispatch({ type: "SET_ACTIVE_VIEW", view: "settings" }); onClose(); }
    },
    {
      id: "nav-dog-racing", icon: <Dog size={14} />, label: "Dog Racing",
      category: "Навигация", shortcut: "⌘G",
      action: () => { dispatch({ type: "SET_ACTIVE_VIEW", view: "dog-racing" }); onClose(); }
    },
    {
      id: "nav-analytics", icon: <Cpu size={14} />, label: "Аналитика",
      category: "Навигация", shortcut: "⌘A",
      action: () => { dispatch({ type: "SET_ACTIVE_VIEW", view: "analytics" }); onClose(); }
    },
    {
      id: "nav-models", icon: <Cpu size={14} />, label: "Реестр моделей",
      category: "Навигация",
      action: () => { dispatch({ type: "SET_ACTIVE_VIEW", view: "models" }); onClose(); }
    },
    {
      id: "nav-admin-groups", icon: <Users size={14} />, label: "Группы",
      description: "Управление группами пользователей",
      category: "Администрирование",
      action: () => { dispatch({ type: "SET_ACTIVE_VIEW", view: "admin-groups" }); onClose(); }
    },
    {
      id: "nav-admin-permissions", icon: <Users size={14} />, label: "Права доступа",
      description: "Матрица разрешений",
      category: "Администрирование",
      action: () => { dispatch({ type: "SET_ACTIVE_VIEW", view: "admin-permissions" }); onClose(); }
    },
    {
      id: "nav-admin-budgets", icon: <Users size={14} />, label: "Бюджеты",
      description: "Лимиты расходов",
      category: "Администрирование",
      action: () => { dispatch({ type: "SET_ACTIVE_VIEW", view: "admin-budgets" }); onClose(); }
    },
    {
      id: "nav-admin-spending", icon: <Users size={14} />, label: "Расходы",
      description: "Аналитика расходов",
      category: "Администрирование",
      action: () => { dispatch({ type: "SET_ACTIVE_VIEW", view: "admin-spending" }); onClose(); }
    },
    {
      id: "nav-admin-logs", icon: <Users size={14} />, label: "Аудит-лог",
      description: "Журнал действий администратора",
      category: "Администрирование",
      action: () => { dispatch({ type: "SET_ACTIVE_VIEW", view: "admin-logs" }); onClose(); }
    },
    // Actions
    {
      id: "action-new-project", icon: <FolderOpen size={14} />, label: "Новый проект",
      category: "Действия", shortcut: "⌘⇧N",
      action: () => {
        const name = `Проект ${state.projects.length + 1}`;
        dispatch({ type: "ADD_PROJECT", name });
        toast.success(`Создан проект «${name}»`);
        onClose();
      }
    },
    {
      id: "action-new-task", icon: <Hash size={14} />, label: "Новая задача",
      description: state.activeProjectId ? `в ${state.projects.find(p => p.id === state.activeProjectId)?.name}` : "выберите проект",
      category: "Действия", shortcut: "⌘N",
      action: () => {
        if (!state.activeProjectId) { toast.error("Сначала выберите проект"); return; }
        const name = `Новая задача ${Date.now().toString().slice(-4)}`;
        dispatch({ type: "ADD_TASK", projectId: state.activeProjectId, taskName: name });
        dispatch({ type: "SET_ACTIVE_VIEW", view: "chat" });
        toast.success(`Создана задача «${name}»`);
        onClose();
      }
    },
    {
      id: "action-toggle-sidebar", icon: <ChevronRight size={14} />, label: "Свернуть/развернуть сайдбар",
      category: "Действия", shortcut: "⌘B",
      action: () => { dispatch({ type: "TOGGLE_LEFT_PANEL" }); onClose(); }
    },
    {
      id: "action-toggle-theme", icon: <Zap size={14} />, label: "Переключить тему",
      category: "Действия", shortcut: "⌘⇧D",
      action: () => { dispatch({ type: "TOGGLE_THEME" }); onClose(); }
    },
    // Shortcuts help
    {
      id: "action-shortcuts", icon: <Hash size={14} />, label: "Показать все горячие клавиши",
      category: "Помощь", shortcut: "⌘/",
      action: () => { toast.info("Откройте ⌘/ для полного списка шорткатов"); onClose(); }
    },
    // Projects
    ...state.projects.map(p => ({
      id: `project-${p.id}`,
      icon: <FolderOpen size={14} className="text-blue-400" />,
      label: p.name,
      description: `${p.tasks.length} задач · $${p.tasks.reduce((s, t) => s + t.cost, 0).toFixed(2)}`,
      category: "Проекты",
      action: () => {
        dispatch({ type: "SET_ACTIVE_VIEW", view: "chat" });
        if (p.tasks.length > 0) {
          dispatch({ type: "SET_ACTIVE_TASK", projectId: p.id, taskId: p.tasks[0].id });
        }
        onClose();
      }
    })),
    // Tasks
    ...state.projects.flatMap(p =>
      p.tasks.map(t => ({
        id: `task-${t.id}`,
        icon: <MessageSquare size={14} className={
          t.status === "done" ? "text-emerald-400" :
          t.status === "error" ? "text-red-400" :
          t.status === "running" ? "text-blue-400" : "text-muted-foreground"
        } />,
        label: t.name,
        description: `${p.name} · $${t.cost.toFixed(4)}`,
        category: "Задачи",
        action: () => {
          dispatch({ type: "SET_ACTIVE_TASK", projectId: p.id, taskId: t.id });
          dispatch({ type: "SET_ACTIVE_VIEW", view: "chat" });
          onClose();
        }
      }))
    ),
    // Models
    ...MODELS.slice(0, 8).map(m => ({
      id: `model-${m.id}`,
      icon: <Cpu size={14} style={{ color: m.color }} />,
      label: m.name,
      description: `${m.provider} · $${m.costOut}/M out`,
      category: "Модели",
      action: () => {
        toast.success(`Модель ${m.name} выбрана`);
        onClose();
      }
    })),
  ];

  const filtered = query.trim()
    ? commands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  // Group by category
  const grouped = filtered.reduce<Record<string, CommandItem[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, flatFiltered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      flatFiltered[selectedIdx]?.action();
    } else if (e.key === "Escape") {
      onClose();
    }
  }, [flatFiltered, selectedIdx, onClose]);

  // Scroll selected into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!open) return null;

  let globalIdx = 0;

  return (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh]"
      onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div className="relative w-full max-w-[560px] mx-4 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search size={15} className="text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Поиск команд, задач, проектов, моделей..."
            className="flex-1 bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
              <X size={13} />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 text-[10px] bg-muted border border-border rounded text-muted-foreground">Esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
          {flatFiltered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Search size={24} className="mx-auto mb-2 opacity-30" />
              <div className="text-[13px]">Ничего не найдено</div>
            </div>
          ) : (
            Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {category}
                </div>
                {items.map(item => {
                  const idx = globalIdx++;
                  const isSelected = idx === selectedIdx;
                  return (
                    <button
                      key={item.id}
                      data-idx={idx}
                      onClick={item.action}
                      onMouseEnter={() => setSelectedIdx(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected ? "bg-accent" : "hover:bg-accent/50"
                      }`}
                    >
                      <span className="text-muted-foreground flex-shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] text-foreground">{item.label}</div>
                        {item.description && (
                          <div className="text-[11px] text-muted-foreground truncate">{item.description}</div>
                        )}
                      </div>
                      {item.shortcut && (
                        <kbd className="flex-shrink-0 px-1.5 py-0.5 text-[10px] bg-muted border border-border rounded text-muted-foreground font-mono">
                          {item.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border bg-muted/30">
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[9px]">↑↓</kbd> навигация
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[9px]">↵</kbd> выбрать
          </span>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[9px]">Esc</kbd> закрыть
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground">{flatFiltered.length} результатов</span>
        </div>
      </div>
    </div>
  );
}
