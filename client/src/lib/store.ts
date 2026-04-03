// === ARCANE 2 — App State Store (no external deps, React-only) ===
import { MOCK_PROJECTS, MOCK_RACES, Project, Race, Task, Message } from "./mockData";

export type View = "chat" | "dog-racing" | "dashboard" | "settings" | "admin" | "playbooks" | "schedule";

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
  | { type: "TOGGLE_THEME" };

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
  theme: "dark",
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
    case "TOGGLE_THEME": {
      const theme = state.theme === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", theme === "dark");
      return { ...state, theme };
    }
    default: return state;
  }
}

// Helpers
export function getProjectCost(projects: Project[], projectId: string): number {
  const proj = projects.find(p => p.id === projectId);
  if (!proj) return 0;
  return proj.tasks.reduce((sum, t) => sum + t.cost, 0);
}
