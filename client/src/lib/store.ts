// === ARCANE 2 — App State Store (no external deps, React-only) ===
import { MOCK_PROJECTS, MOCK_RACES, Project, Race, Task, Message } from "./mockData";

export type View = "chat" | "dog-racing" | "dashboard" | "settings" | "admin" | "playbooks" | "schedule" | "models" | "consolidation" | "analytics" | "admin-users" | "admin-groups" | "admin-permissions" | "admin-budgets" | "admin-logs" | "admin-spending";

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  activeTaskId: string | null;
  activeView: View;
  races: Race[];
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;
  leftPanelWidth: number;
  rightPanelWidth: number;
  theme: "dark" | "light";
}

export type AppAction =
  | { type: "SET_ACTIVE_TASK"; projectId: string; taskId: string }
  | { type: "SET_ACTIVE_VIEW"; view: View }
  | { type: "ADD_MESSAGE"; projectId: string; taskId: string; message: Message }
  | { type: "UPDATE_TASK_STATUS"; projectId: string; taskId: string; status: Task["status"]; duration?: string }
  | { type: "ADD_TASK"; projectId: string; taskName: string }
  | { type: "ADD_PROJECT"; name: string }
  | { type: "TOGGLE_LEFT_PANEL" }
  | { type: "TOGGLE_RIGHT_PANEL" }
  | { type: "SET_LEFT_WIDTH"; width: number }
  | { type: "SET_RIGHT_WIDTH"; width: number }
  | { type: "ADD_RACE"; race: Race }
  | { type: "TOGGLE_THEME" }
  | { type: "MOVE_TASK"; taskId: string; fromProjectId: string; toProjectId: string }
  | { type: "RENAME_TASK"; projectId: string; taskId: string; name: string }
  | { type: "RENAME_PROJECT"; projectId: string; name: string }
  | { type: "DELETE_TASK"; projectId: string; taskId: string }
  | { type: "DELETE_PROJECT"; projectId: string }
  | { type: "SET_PROJECT_BUDGET"; projectId: string; budget: number | undefined }
  | { type: "EDIT_MESSAGE"; projectId: string; taskId: string; messageId: string; content: string }
  | { type: "DUPLICATE_TASK"; projectId: string; taskId: string }
  | { type: "PIN_TASK"; projectId: string; taskId: string }
  | { type: "UPDATE_TASK_AGENTS"; projectId: string; taskId: string; agentIds: string[]; chatMode: string; collectiveModelIds?: string[]; agentModelOverrides?: Record<string, string> };

// Read saved theme from localStorage, default to "dark"
const savedTheme = (typeof window !== "undefined" && (localStorage.getItem("arcane-theme") as "dark" | "light")) || "dark";
// Apply immediately to avoid flash
if (typeof document !== "undefined") {
  document.documentElement.classList.toggle("dark", savedTheme === "dark");
}

export const initialState: AppState = {
  projects: MOCK_PROJECTS,
  activeProjectId: "p1",
  activeTaskId: "t1",
  activeView: "chat",
  races: MOCK_RACES,
  leftPanelOpen: true,
  rightPanelOpen: true,
  leftPanelWidth: 260,
  rightPanelWidth: 380,
  theme: savedTheme,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_ACTIVE_TASK":
      return { ...state, activeProjectId: action.projectId, activeTaskId: action.taskId, activeView: "chat" };
    case "SET_ACTIVE_VIEW":
      return { ...state, activeView: action.view, activeTaskId: action.view === "chat" ? state.activeTaskId : state.activeTaskId };
    case "ADD_MESSAGE": {
      const projects = state.projects.map(p => {
        if (p.id !== action.projectId) return p;
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id !== action.taskId) return t;
            const newCost = t.cost + (action.message.cost || 0);
            return { ...t, messages: [...t.messages, action.message], cost: parseFloat(newCost.toFixed(4)) };
          }),
        };
      });
      return { ...state, projects };
    }
    case "UPDATE_TASK_STATUS": {
      const projects = state.projects.map(p => {
        if (p.id !== action.projectId) return p;
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id !== action.taskId) return t;
            return { ...t, status: action.status, ...(action.duration ? { duration: action.duration } : {}) };
          }),
        };
      });
      return { ...state, projects };
    }
    case "ADD_TASK": {
      const newTask: Task = {
        id: `t${Date.now()}`, name: action.taskName, status: "idle",
        cost: 0, duration: "—", model: "claude-sonnet-4.6",
        messages: [], createdAt: new Date().toISOString().split("T")[0],
      };
      const projects = state.projects.map(p =>
        p.id === action.projectId ? { ...p, tasks: [...p.tasks, newTask] } : p
      );
      return { ...state, projects, activeProjectId: action.projectId, activeTaskId: newTask.id, activeView: "chat" };
    }
    case "ADD_PROJECT": {
      const newProj: Project = {
        id: `p${Date.now()}`, name: action.name, tasks: [],
        createdAt: new Date().toISOString().split("T")[0],
      };
      return { ...state, projects: [...state.projects, newProj], activeProjectId: newProj.id, activeTaskId: null };
    }
    case "TOGGLE_LEFT_PANEL":  return { ...state, leftPanelOpen: !state.leftPanelOpen };
    case "TOGGLE_RIGHT_PANEL": return { ...state, rightPanelOpen: !state.rightPanelOpen };
    case "SET_LEFT_WIDTH":  return { ...state, leftPanelWidth: action.width };
    case "SET_RIGHT_WIDTH": return { ...state, rightPanelWidth: action.width };
    case "ADD_RACE": return { ...state, races: [action.race, ...state.races] };
    case "MOVE_TASK": {
      if (action.fromProjectId === action.toProjectId) return state;
      const task = state.projects.find(p => p.id === action.fromProjectId)?.tasks.find(t => t.id === action.taskId);
      if (!task) return state;
      const projects = state.projects.map(p => {
        if (p.id === action.fromProjectId) {
          // Keep the moved task's cost in spentCost of the source project (money was spent there)
          const newSpent = parseFloat(((p.spentCost ?? 0) + task.cost).toFixed(4));
          return { ...p, tasks: p.tasks.filter(t => t.id !== action.taskId), spentCost: newSpent };
        }
        if (p.id === action.toProjectId) return { ...p, tasks: [...p.tasks, task] };
        return p;
      });
      const newActiveTask = state.activeTaskId === action.taskId ? action.taskId : state.activeTaskId;
      const newActiveProject = state.activeTaskId === action.taskId ? action.toProjectId : state.activeProjectId;
      return { ...state, projects, activeProjectId: newActiveProject, activeTaskId: newActiveTask };
    }
    case "RENAME_TASK": {
      const projects = state.projects.map(p =>
        p.id !== action.projectId ? p : { ...p, tasks: p.tasks.map(t => t.id === action.taskId ? { ...t, name: action.name } : t) }
      );
      return { ...state, projects };
    }
    case "RENAME_PROJECT": {
      const projects = state.projects.map(p => p.id === action.projectId ? { ...p, name: action.name } : p);
      return { ...state, projects };
    }
    case "DELETE_TASK": {
      const projects = state.projects.map(p => {
        if (p.id !== action.projectId) return p;
        const task = p.tasks.find(t => t.id === action.taskId);
        const taskCost = task?.cost ?? 0;
        // Accumulate the deleted task's cost into spentCost so it's never lost
        const newSpent = parseFloat(((p.spentCost ?? 0) + taskCost).toFixed(4));
        return { ...p, tasks: p.tasks.filter(t => t.id !== action.taskId), spentCost: newSpent };
      });
      const wasActive = state.activeTaskId === action.taskId && state.activeProjectId === action.projectId;
      return { ...state, projects, activeTaskId: wasActive ? null : state.activeTaskId };
    }
    case "DELETE_PROJECT": {
      const projects = state.projects.filter(p => p.id !== action.projectId);
      const wasActive = state.activeProjectId === action.projectId;
      return { ...state, projects, activeProjectId: wasActive ? null : state.activeProjectId, activeTaskId: wasActive ? null : state.activeTaskId };
    }
    case "SET_PROJECT_BUDGET": {
      const projects = state.projects.map(p =>
        p.id !== action.projectId ? p : { ...p, budget: action.budget }
      );
      return { ...state, projects };
    }
    case "EDIT_MESSAGE": {
      const projects = state.projects.map(p => {
        if (p.id !== action.projectId) return p;
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id !== action.taskId) return t;
            return { ...t, messages: t.messages.map(m => m.id === action.messageId ? { ...m, content: action.content } : m) };
          }),
        };
      });
      return { ...state, projects };
    }
    case "DUPLICATE_TASK": {
      const srcTask = state.projects.find(p => p.id === action.projectId)?.tasks.find(t => t.id === action.taskId);
      if (!srcTask) return state;
      const dupTask = { ...srcTask, id: `t${Date.now()}`, name: `${srcTask.name} (копия)`, cost: 0, messages: [], status: "idle" as const };
      const projects = state.projects.map(p =>
        p.id === action.projectId ? { ...p, tasks: [...p.tasks, dupTask] } : p
      );
      return { ...state, projects, activeTaskId: dupTask.id };
    }
    case "PIN_TASK": {
      const projects = state.projects.map(p => {
        if (p.id !== action.projectId) return p;
        const task = p.tasks.find(t => t.id === action.taskId);
        if (!task) return p;
        const pinned = !task.pinned;
        const tasks = p.tasks.map(t => t.id === action.taskId ? { ...t, pinned } : t);
        // Sort: pinned first
        tasks.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
        return { ...p, tasks };
      });
      return { ...state, projects };
    }
    case "TOGGLE_THEME": {
      const theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", theme === "dark");
      localStorage.setItem("arcane-theme", theme);
      return { ...state, theme };
    }
    case "UPDATE_TASK_AGENTS": {
      const now = new Date().toISOString();
      const projects = state.projects.map(p => {
        if (p.id !== action.projectId) return p;
        return {
          ...p,
          tasks: p.tasks.map(t => {
            if (t.id !== action.taskId) return t;
            // Import ALL_AGENTS mapping inline to get modelId per agentId
            const AGENT_MODEL_MAP: Record<string, string> = {
              orchestrator: "claude-opus-4.6",
              planner: "claude-sonnet-4.6",
              coder: "deepseek-v3.2",
              reviewer: "gpt-5.4",
              researcher: "gemini-3.1-pro",
              writer: "claude-sonnet-4.6",
              analyst: "gpt-5.4",
              tester: "gemini-2.5-flash",
            };
            const overrides = action.agentModelOverrides ?? {};
            const usedAgents = action.agentIds.map(agentId => {
              const defaultModel = AGENT_MODEL_MAP[agentId] ?? "claude-sonnet-4.6";
              const overriddenModel = overrides[agentId];
              return {
                agentId,
                modelId: overriddenModel ?? defaultModel,
                modelOverridden: !!overriddenModel && overriddenModel !== defaultModel,
                addedAt: now,
              };
            });
            return {
              ...t,
              usedAgents,
              chatMode: action.chatMode,
              collectiveModelIds: action.collectiveModelIds,
              agentModelOverrides: Object.keys(overrides).length > 0 ? overrides : undefined,
            };
          }),
        };
      });
      return { ...state, projects };
    }
    default: return state;
  }
}

// Helpers
export function getProjectCost(projects: Project[], projectId: string): number {
  const proj = projects.find(p => p.id === projectId);
  if (!proj) return 0;
  // Live task costs + any cost from deleted/moved tasks (spentCost is cumulative, never decreases)
  const liveCost = proj.tasks.reduce((sum, t) => sum + t.cost, 0);
  return parseFloat((liveCost + (proj.spentCost ?? 0)).toFixed(4));
}
