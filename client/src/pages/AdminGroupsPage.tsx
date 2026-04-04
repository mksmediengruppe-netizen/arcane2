// AdminGroupsPage — Groups management with members, manager, budget
import { useState, useEffect } from "react";
import {
  ADMIN_GROUPS, ADMIN_USERS,
  type AdminGroup, type BudgetPeriod, type BudgetAction,
} from "@/lib/mockData";
import { api } from "@/lib/api";

const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  day: "День", week: "Неделя", month: "Месяц", total: "Всего",
};
const ACTION_LABELS: Record<BudgetAction, string> = {
  warn: "Предупреждение", block: "Блокировка", notify_admin: "Уведомить админа",
};

const GROUP_COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#84CC16", "#EC4899"];

function ProgressBar({ value, alert }: { value: number; alert: number }) {
  const color = value >= 100 ? "bg-red-500" : value >= alert ? "bg-amber-400" : "bg-blue-500";
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

interface GroupModalProps {
  group: AdminGroup | null;
  onClose: () => void;
  onSave: (g: AdminGroup) => void;
}

function GroupModal({ group, onClose, onSave }: GroupModalProps) {
  const isNew = !group;
  const [form, setForm] = useState<AdminGroup>(group ?? {
    id: `g${Date.now()}`,
    name: "", description: "",
    managerId: null, memberIds: [],
    budget: { amount: 100, period: "month", alertThreshold: 80, actionOnExceed: "warn" },
    spent: 0, color: GROUP_COLORS[0],
  });

  const set = (patch: Partial<AdminGroup>) => setForm(f => ({ ...f, ...patch }));

  function toggleMember(uid: string) {
    set({ memberIds: form.memberIds.includes(uid) ? form.memberIds.filter(x => x !== uid) : [...form.memberIds, uid] });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-900">{isNew ? "Новая группа" : `Редактировать: ${group?.name}`}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Name + color */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">Название группы</label>
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Разработка" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Цвет</label>
              <div className="flex gap-1 flex-wrap w-28">
                {GROUP_COLORS.map(c => (
                  <button key={c} onClick={() => set({ color: c })}
                    className={`w-6 h-6 rounded-full transition-transform ${form.color === c ? "scale-125 ring-2 ring-offset-1 ring-slate-400" : "hover:scale-110"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Описание</label>
            <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.description} onChange={e => set({ description: e.target.value })} placeholder="Краткое описание группы" />
          </div>

          {/* Manager */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Менеджер группы</label>
            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.managerId ?? ""} onChange={e => set({ managerId: e.target.value || null })}>
              <option value="">— Без менеджера —</option>
              {ADMIN_USERS.filter(u => u.role !== "user").map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          {/* Members */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-2">Участники ({form.memberIds.length})</label>
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
              {ADMIN_USERS.map(u => (
                <label key={u.id} className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0">
                  <input type="checkbox" className="rounded" checked={form.memberIds.includes(u.id)} onChange={() => toggleMember(u.id)} />
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: u.avatarColor }}>{u.avatarInitials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-800 font-medium truncate">{u.name}</div>
                    <div className="text-xs text-slate-400 truncate">{u.email}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Бюджет группы</h3>
              <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer ml-auto">
                <input type="checkbox" checked={!!form.budget} onChange={e => set({ budget: e.target.checked ? { amount: 100, period: "month", alertThreshold: 80, actionOnExceed: "warn" } : null })} className="rounded" />
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
                  <label className="block text-xs font-medium text-slate-500 mb-1">Порог (%)</label>
                  <input type="number" min={0} max={100} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.budget.alertThreshold} onChange={e => set({ budget: { ...form.budget!, alertThreshold: +e.target.value } })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">При превышении</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={form.budget.actionOnExceed} onChange={e => set({ budget: { ...form.budget!, actionOnExceed: e.target.value as BudgetAction } })}>
                    {(Object.entries(ACTION_LABELS) as [BudgetAction, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

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

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState<AdminGroup[]>([]);

  useEffect(() => {
    api.admin.groups.list().then((data: any) => {
      const mapped: AdminGroup[] = (data.groups || data || []).map((g: any, idx: number) => ({
        id: g.id || `g${Date.now()}`,
        name: g.name || "",
        description: g.description || "",
        managerId: g.manager_id || g.managerId || undefined,
        memberIds: g.member_ids || g.members || [],
        members: g.member_ids || g.members || [],
        budget: g.budget ? { amount: g.budget, period: (g.budget_period || "month") as BudgetPeriod, alertThreshold: g.budget_alert || 80, actionOnExceed: (g.budget_action || "warn") as BudgetAction } : null,
        spent: g.spent_usd || g.spent || 0,
        color: g.color || GROUP_COLORS[idx % GROUP_COLORS.length],
        createdAt: g.created_at || new Date().toISOString(),
      }));
      setGroups(mapped.length > 0 ? mapped : ADMIN_GROUPS);
    }).catch(() => setGroups(ADMIN_GROUPS));
  }, []);
  const [editGroup, setEditGroup] = useState<AdminGroup | null | undefined>(undefined);

  function handleSave(g: AdminGroup) {
    setGroups(prev => {
      const idx = prev.findIndex(x => x.id === g.id);
      if (idx >= 0) return prev.map(x => x.id === g.id ? g : x);
      return [...prev, g];
    });
    setEditGroup(undefined);
  }

  function deleteGroup(id: string) {
    setGroups(prev => prev.filter(g => g.id !== id));
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Группы</h1>
            <p className="text-sm text-slate-500 mt-0.5">Организация пользователей по командам</p>
          </div>
          <button onClick={() => setEditGroup(null)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            <span>+</span> Новая группа
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map(g => {
            const manager = ADMIN_USERS.find(u => u.id === g.managerId);
            const members = ADMIN_USERS.filter(u => g.memberIds.includes(u.id));
            const pct = g.budget ? Math.min(100, (g.spent / g.budget.amount) * 100) : null;

            return (
              <div key={g.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                      style={{ backgroundColor: g.color }}>{g.name[0]}</div>
                    <div>
                      <div className="font-semibold text-slate-900">{g.name}</div>
                      <div className="text-xs text-slate-400">{g.description}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setEditGroup(g)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">Изменить</button>
                    <button onClick={() => deleteGroup(g.id)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded transition-colors">Удалить</button>
                  </div>
                </div>

                {/* Manager */}
                <div className="flex items-center gap-2 mb-4 text-sm">
                  <span className="text-slate-400 text-xs">Менеджер:</span>
                  {manager ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ backgroundColor: manager.avatarColor }}>{manager.avatarInitials}</div>
                      <span className="text-slate-700 text-xs font-medium">{manager.name}</span>
                    </div>
                  ) : <span className="text-slate-400 text-xs">Не назначен</span>}
                </div>

                {/* Members */}
                <div className="mb-4">
                  <div className="text-xs text-slate-400 mb-2">Участники ({members.length})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {members.map(u => (
                      <div key={u.id} className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full text-xs text-slate-700">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: u.avatarColor, fontSize: "8px" }}>{u.avatarInitials}</div>
                        {u.name.split(" ")[0]}
                      </div>
                    ))}
                    {members.length === 0 && <span className="text-xs text-slate-400">Нет участников</span>}
                  </div>
                </div>

                {/* Budget */}
                {g.budget && pct !== null ? (
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-600 font-medium">${g.spent.toFixed(2)} потрачено</span>
                      <span className="text-slate-400">${g.budget.amount} / {PERIOD_LABELS[g.budget.period]}</span>
                    </div>
                    <ProgressBar value={pct} alert={g.budget.alertThreshold} />
                    {pct >= g.budget.alertThreshold && (
                      <div className="text-xs text-amber-600 mt-1">⚠ {pct.toFixed(0)}% лимита группы</div>
                    )}
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-100 text-xs text-slate-400">
                    Бюджет не установлен · ${g.spent.toFixed(2)} потрачено
                  </div>
                )}
              </div>
            );
          })}

          {groups.length === 0 && (
            <div className="col-span-2 text-center py-16 text-slate-400">
              <div className="text-4xl mb-2">👥</div>
              <div>Группы не созданы</div>
            </div>
          )}
        </div>
      </div>

      {editGroup !== undefined && (
        <GroupModal group={editGroup} onClose={() => setEditGroup(undefined)} onSave={handleSave} />
      )}
    </div>
  );
}
