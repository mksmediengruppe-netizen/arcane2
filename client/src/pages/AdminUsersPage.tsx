// AdminUsersPage — Design: clean admin table, slate/blue palette, modal overlays
// Role: Superadmin/Admin only. Shows all users, create/edit/block actions.

import { useState, useMemo, useEffect } from "react";
import { api } from "@/lib/api";
import {
  ADMIN_USERS, ADMIN_GROUPS, MODELS, DEFAULT_PERMISSIONS,
  type AdminUser, type UserRole, type UserStatus, type BudgetPeriod,
  type BudgetAction, type Permission, type TaskVisibility,
} from "@/lib/mockData";

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Супер-админ",
  admin: "Администратор",
  group_manager: "Менеджер группы",
  user: "Пользователь",
};
const ROLE_COLORS: Record<UserRole, string> = {
  super_admin: "bg-blue-100 text-blue-700",
  admin: "bg-purple-100 text-purple-700",
  group_manager: "bg-emerald-100 text-emerald-700",
  user: "bg-slate-100 text-slate-600",
};
const STATUS_COLORS: Record<UserStatus, string> = {
  active: "bg-green-100 text-green-700",
  blocked: "bg-red-100 text-red-700",
  pending: "bg-yellow-100 text-yellow-700",
};
const STATUS_LABELS: Record<UserStatus, string> = {
  active: "Активен",
  blocked: "Заблокирован",
  pending: "Ожидает",
};
const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  day: "День", week: "Неделя", month: "Месяц", total: "Всего",
};
const ACTION_LABELS: Record<BudgetAction, string> = {
  warn: "Предупреждение", block: "Блокировка", notify_admin: "Уведомить админа",
};

const VISIBILITY_LABELS: Record<TaskVisibility, string> = {
  own: "Только свои", group: "Своя группа", all: "Все задачи",
};

function getSpentPercent(user: AdminUser): number | null {
  if (!user.budget) return null;
  return Math.min(100, (user.spent / user.budget.amount) * 100);
}

function ProgressBar({ value, alert }: { value: number; alert: number }) {
  const color = value >= 100 ? "bg-red-500" : value >= alert ? "bg-amber-400" : "bg-blue-500";
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

interface UserModalProps {
  user: AdminUser | null;
  onClose: () => void;
  onSave: (u: AdminUser) => void;
}

function UserModal({ user, onClose, onSave }: UserModalProps) {
  const isNew = !user;
  const [form, setForm] = useState<AdminUser>(user ?? {
    id: `u${Date.now()}`,
    name: "", email: "",
    role: "user", status: "active",
    groupId: null,
    avatarInitials: "",
    avatarColor: "#3B82F6",
    createdAt: new Date().toISOString().slice(0, 10),
    lastActiveAt: new Date().toISOString(),
    budget: { amount: 20, period: "month", alertThreshold: 80, actionOnExceed: "warn" },
    spent: 0,
    permissions: { ...DEFAULT_PERMISSIONS.user },
  });

  const set = (patch: Partial<AdminUser>) => setForm(f => ({ ...f, ...patch }));
  const setPerm = (patch: Partial<Permission>) => setForm(f => ({ ...f, permissions: { ...f.permissions, ...patch } }));

  function handleRoleChange(role: UserRole) {
    set({ role, permissions: { ...DEFAULT_PERMISSIONS[role] } });
  }

  function toggleModel(id: string) {
    const current = form.permissions.allowedModelIds;
    if (current === null) {
      // switch to whitelist mode, remove this one
      setPerm({ allowedModelIds: MODELS.map(m => m.id).filter(m => m !== id) });
    } else {
      if (current.includes(id)) {
        const next = current.filter(m => m !== id);
        setPerm({ allowedModelIds: next.length === MODELS.length ? null : next });
      } else {
        const next = [...current, id];
        setPerm({ allowedModelIds: next.length === MODELS.length ? null : next });
      }
    }
  }

  const allModels = form.permissions.allowedModelIds === null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{isNew ? "Новый пользователь" : `Редактировать: ${user?.name}`}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">✕</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Имя</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Иван Иванов" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.email} onChange={e => set({ email: e.target.value })} placeholder="user@company.ru" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Роль</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.role} onChange={e => handleRoleChange(e.target.value as UserRole)}>
                {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Группа</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.groupId ?? ""} onChange={e => set({ groupId: e.target.value || null })}>
                <option value="">— Без группы —</option>
                {ADMIN_GROUPS.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Статус</label>
              <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status} onChange={e => set({ status: e.target.value as UserStatus })}>
                <option value="active">Активен</option>
                <option value="blocked">Заблокирован</option>
                <option value="pending">Ожидает</option>
              </select>
            </div>
          </div>

          {/* Budget */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Бюджет</h3>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer ml-auto">
                <input type="checkbox" checked={!!form.budget} onChange={e => set({ budget: e.target.checked ? { amount: 20, period: "month", alertThreshold: 80, actionOnExceed: "warn" } : null })} className="rounded" />
                Установить лимит
              </label>
            </div>
            {form.budget && (
              <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-xl">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Сумма ($)</label>
                  <input type="number" min={0} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.budget.amount} onChange={e => set({ budget: { ...form.budget!, amount: +e.target.value } })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Период</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.budget.period} onChange={e => set({ budget: { ...form.budget!, period: e.target.value as BudgetPeriod } })}>
                    {(Object.entries(PERIOD_LABELS) as [BudgetPeriod, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Порог уведомления (%)</label>
                  <input type="number" min={0} max={100} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.budget.alertThreshold} onChange={e => set({ budget: { ...form.budget!, alertThreshold: +e.target.value } })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Действие при превышении</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.budget.actionOnExceed} onChange={e => set({ budget: { ...form.budget!, actionOnExceed: e.target.value as BudgetAction } })}>
                    {(Object.entries(ACTION_LABELS) as [BudgetAction, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Permissions */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Права доступа</h3>
            <div className="p-4 bg-slate-50 rounded-xl space-y-4">
              {/* Task visibility */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Видимость задач</label>
                <div className="flex gap-2">
                  {(["own", "group", "all"] as TaskVisibility[]).map(v => (
                    <button key={v} onClick={() => setPerm({ taskVisibility: v })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${form.permissions.taskVisibility === v ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"}`}>
                      {VISIBILITY_LABELS[v]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section access toggles */}
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-2">Доступ к разделам</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    ["canViewAnalytics", "Аналитика"],
                    ["canViewModels", "Реестр моделей"],
                    ["canViewLogs", "Логи"],
                    ["canViewBudgets", "Бюджеты (просмотр)"],
                    ["canManageBudgets", "Бюджеты (управление)"],
                    ["canViewConsolidation", "Консолидация"],
                    ["canViewDogRacing", "Dog Racing"],
                  ] as [keyof Permission, string][]).map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input type="checkbox" className="rounded"
                        checked={!!form.permissions[key]}
                        onChange={e => setPerm({ [key]: e.target.checked } as Partial<Permission>)} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Allowed models */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-slate-500">Доступные модели</label>
                  <button onClick={() => setPerm({ allowedModelIds: null })}
                    className={`text-xs px-2 py-0.5 rounded ${allModels ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                    Все модели
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {MODELS.map(m => {
                    const allowed = allModels || (form.permissions.allowedModelIds?.includes(m.id) ?? false);
                    return (
                      <button key={m.id} onClick={() => toggleModel(m.id)}
                        className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${allowed ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400 line-through"}`}>
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Отмена</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            {isNew ? "Создать" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);

  useEffect(() => {
    api.admin.users.list().then((data: any) => {
      const mapped: AdminUser[] = (data.users || data || []).map((u: any) => ({
        id: u.id || u.user_id || `u${Date.now()}`,
        name: u.name || u.username || u.email?.split("@")[0] || "—",
        email: u.email || "",
        role: (u.role as UserRole) || "user",
        status: (u.status as UserStatus) || "active",
        spent: u.spent_usd || u.spent || 0,
        budget: u.budget ? { amount: u.budget, period: (u.budget_period || "month") as BudgetPeriod, alert: u.budget_alert || 80, action: (u.budget_action || "warn") as BudgetAction } : null,
        group: u.group_id || u.group || undefined,
        permissions: u.permissions || DEFAULT_PERMISSIONS,
        task_visibility: (u.task_visibility as TaskVisibility) || "own",
        created_at: u.created_at || new Date().toISOString(),
        last_active: u.last_active || u.last_login || undefined,
      }));
      setUsers(mapped.length > 0 ? mapped : ADMIN_USERS);
    }).catch(() => setUsers(ADMIN_USERS));
  }, []);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [editUser, setEditUser] = useState<AdminUser | null | undefined>(undefined); // undefined = closed
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => users.filter(u => {
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (statusFilter !== "all" && u.status !== statusFilter) return false;
    return true;
  }), [users, search, roleFilter, statusFilter]);

  function toggleBlock(id: string) {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "blocked" ? "active" : "blocked" } : u));
  }

  function handleSave(u: AdminUser) {
    setUsers(prev => {
      const idx = prev.findIndex(x => x.id === u.id);
      if (idx >= 0) return prev.map(x => x.id === u.id ? u : x);
      return [...prev, u];
    });
    setEditUser(undefined);
  }

  const totalSpent = users.reduce((s, u) => s + u.spent, 0);
  const activeCount = users.filter(u => u.status === "active").length;
  const blockedCount = users.filter(u => u.status === "blocked").length;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Пользователи</h1>
            <p className="text-sm text-slate-500 mt-0.5">Управление доступами и бюджетами</p>
          </div>
          <button onClick={() => setEditUser(null)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <span>+</span> Новый пользователь
          </button>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          {[
            { label: "Всего пользователей", value: users.length, color: "text-slate-900" },
            { label: "Активных", value: activeCount, color: "text-green-600" },
            { label: "Заблокировано", value: blockedCount, color: "text-red-500" },
            { label: "Общие расходы", value: `$${totalSpent.toFixed(2)}`, color: "text-blue-600" },
          ].map(k => (
            <div key={k.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{k.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <input className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Поиск по имени или email..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={roleFilter} onChange={e => setRoleFilter(e.target.value as UserRole | "all")}>
            <option value="all">Все роли</option>
            {(Object.entries(ROLE_LABELS) as [UserRole, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter} onChange={e => setStatusFilter(e.target.value as UserStatus | "all")}>
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="blocked">Заблокированные</option>
            <option value="pending">Ожидающие</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Пользователь</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Роль</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Группа</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Бюджет / Расходы</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Последняя активность</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const group = ADMIN_GROUPS.find(g => g.id === u.groupId);
                const pct = getSpentPercent(u);
                const isExpanded = expandedId === u.id;
                return (
                  <>
                    <tr key={u.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${u.status === "blocked" ? "opacity-60" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: u.avatarColor }}>{u.avatarInitials}</div>
                          <div>
                            <div className="font-medium text-slate-900">{u.name}</div>
                            <div className="text-xs text-slate-400">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.role]}`}>{ROLE_LABELS[u.role]}</span>
                      </td>
                      <td className="px-4 py-3">
                        {group ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                            <span className="text-slate-700">{group.name}</span>
                          </div>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[u.status]}`}>{STATUS_LABELS[u.status]}</span>
                      </td>
                      <td className="px-4 py-3 min-w-[160px]">
                        {u.budget ? (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-slate-600 font-medium">${u.spent.toFixed(2)}</span>
                              <span className="text-slate-400">${u.budget.amount} / {PERIOD_LABELS[u.budget.period]}</span>
                            </div>
                            <ProgressBar value={pct!} alert={u.budget.alertThreshold} />
                            {pct! >= u.budget.alertThreshold && (
                              <div className="text-xs text-amber-600 mt-0.5">⚠ {pct!.toFixed(0)}% лимита</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Без лимита · ${u.spent.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {new Date(u.lastActiveAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setExpandedId(isExpanded ? null : u.id)}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
                            {isExpanded ? "Свернуть" : "Права"}
                          </button>
                          <button onClick={() => setEditUser(u)}
                            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">Изменить</button>
                          {u.role !== "super_admin" && (
                            <button onClick={() => toggleBlock(u.id)}
                              className={`px-2 py-1 text-xs rounded transition-colors ${u.status === "blocked" ? "text-green-600 hover:bg-green-50" : "text-red-500 hover:bg-red-50"}`}>
                              {u.status === "blocked" ? "Разблокировать" : "Заблокировать"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${u.id}-expanded`} className="bg-slate-50 border-b border-slate-100">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-3 gap-6 text-xs">
                            <div>
                              <div className="font-semibold text-slate-600 mb-2">Видимость задач</div>
                              <div className="px-2 py-1 bg-blue-100 text-blue-700 rounded inline-block">{VISIBILITY_LABELS[u.permissions.taskVisibility]}</div>
                            </div>
                            <div>
                              <div className="font-semibold text-slate-600 mb-2">Разделы</div>
                              <div className="flex flex-wrap gap-1">
                                {[
                                  [u.permissions.canViewAnalytics, "Аналитика"],
                                  [u.permissions.canViewModels, "Модели"],
                                  [u.permissions.canViewLogs, "Логи"],
                                  [u.permissions.canViewBudgets, "Бюджеты"],
                                  [u.permissions.canViewConsolidation, "Консолидация"],
                                  [u.permissions.canViewDogRacing, "Dog Racing"],
                                ].map(([ok, label]) => (
                                  <span key={label as string} className={`px-1.5 py-0.5 rounded text-xs ${ok ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-400 line-through"}`}>{label as string}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="font-semibold text-slate-600 mb-2">Модели</div>
                              <div className="text-slate-600">
                                {u.permissions.allowedModelIds === null
                                  ? <span className="text-green-600">Все модели разрешены</span>
                                  : <span>{u.permissions.allowedModelIds.length} из {MODELS.length} моделей</span>}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">👤</div>
              <div>Пользователи не найдены</div>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {editUser !== undefined && (
        <UserModal user={editUser} onClose={() => setEditUser(undefined)} onSave={handleSave} />
      )}
    </div>
  );
}
