// AdminBudgetsPage — 3-level budget management: org / group / user
import { useState } from "react";
import {
  ADMIN_USERS, ADMIN_GROUPS,
  type AdminUser, type AdminGroup, type BudgetPeriod, type BudgetAction,
} from "@/lib/mockData";

const PERIOD_LABELS: Record<BudgetPeriod, string> = {
  day: "День", week: "Неделя", month: "Месяц", total: "Всего",
};
const ACTION_LABELS: Record<BudgetAction, string> = {
  warn: "Предупреждение", block: "Блокировка", notify_admin: "Уведомить админа",
};
const ACTION_COLORS: Record<BudgetAction, string> = {
  warn: "bg-yellow-100 text-yellow-700",
  block: "bg-red-100 text-red-700",
  notify_admin: "bg-blue-100 text-blue-700",
};

function ProgressBar({ value, alert }: { value: number; alert: number }) {
  const color = value >= 100 ? "bg-red-500" : value >= alert ? "bg-amber-400" : "bg-emerald-500";
  return (
    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

function BudgetCard({
  name, initials, color, spent, budget, subtitle, onEdit,
}: {
  name: string; initials: string; color: string; spent: number;
  budget: { amount: number; period: BudgetPeriod; alertThreshold: number; actionOnExceed: BudgetAction } | null;
  subtitle?: string; onEdit: () => void;
}) {
  const pct = budget ? Math.min(100, (spent / budget.amount) * 100) : null;
  const isAlert = budget && pct !== null && pct >= budget.alertThreshold;
  const isExceeded = pct !== null && pct >= 100;

  return (
    <div className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${isExceeded ? "border-red-200" : isAlert ? "border-amber-200" : "border-slate-200"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ backgroundColor: color }}>{initials}</div>
          <div>
            <div className="font-medium text-slate-900 text-sm">{name}</div>
            {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
          </div>
        </div>
        <button onClick={onEdit} className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors">Изменить</button>
      </div>

      {budget && pct !== null ? (
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className={`font-semibold ${isExceeded ? "text-red-600" : isAlert ? "text-amber-600" : "text-slate-700"}`}>
              ${spent.toFixed(2)}
            </span>
            <span className="text-slate-400">${budget.amount} / {PERIOD_LABELS[budget.period]}</span>
          </div>
          <ProgressBar value={pct} alert={budget.alertThreshold} />
          <div className="flex items-center justify-between mt-2">
            <div className="text-xs text-slate-400">{pct.toFixed(1)}% использовано</div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${ACTION_COLORS[budget.actionOnExceed]}`}>
              {ACTION_LABELS[budget.actionOnExceed]}
            </span>
          </div>
          {isAlert && !isExceeded && (
            <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
              ⚠ Превышен порог {budget.alertThreshold}%
            </div>
          )}
          {isExceeded && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
              🚫 Лимит исчерпан
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-slate-400 mt-1">
          Без лимита · ${spent.toFixed(2)} потрачено
          <button onClick={onEdit} className="ml-2 text-blue-500 hover:underline">Установить</button>
        </div>
      )}
    </div>
  );
}

interface EditModalProps {
  title: string;
  budget: { amount: number; period: BudgetPeriod; alertThreshold: number; actionOnExceed: BudgetAction } | null;
  onClose: () => void;
  onSave: (b: { amount: number; period: BudgetPeriod; alertThreshold: number; actionOnExceed: BudgetAction } | null) => void;
}

function EditModal({ title, budget, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState(budget ?? { amount: 50, period: "month" as BudgetPeriod, alertThreshold: 80, actionOnExceed: "warn" as BudgetAction });
  const [enabled, setEnabled] = useState(!!budget);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md m-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input type="checkbox" className="rounded" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            Установить бюджетный лимит
          </label>
          {enabled && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Сумма ($)</label>
                <input type="number" min={0} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.amount} onChange={e => setForm(f => ({ ...f, amount: +e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Период</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value as BudgetPeriod }))}>
                  {(Object.entries(PERIOD_LABELS) as [BudgetPeriod, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Порог уведомления (%)</label>
                <input type="number" min={0} max={100} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.alertThreshold} onChange={e => setForm(f => ({ ...f, alertThreshold: +e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">При превышении</label>
                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.actionOnExceed} onChange={e => setForm(f => ({ ...f, actionOnExceed: e.target.value as BudgetAction }))}>
                  {(Object.entries(ACTION_LABELS) as [BudgetAction, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Отмена</button>
          <button onClick={() => onSave(enabled ? form : null)} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">Сохранить</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminBudgetsPage() {
  const [users, setUsers] = useState<AdminUser[]>(ADMIN_USERS);
  const [groups, setGroups] = useState<AdminGroup[]>(ADMIN_GROUPS);
  const [orgBudget, setOrgBudget] = useState<{ amount: number; period: BudgetPeriod; alertThreshold: number; actionOnExceed: BudgetAction } | null>(
    { amount: 500, period: "month", alertThreshold: 80, actionOnExceed: "notify_admin" }
  );
  const [orgSpent] = useState(users.reduce((s, u) => s + u.spent, 0));
  const [editTarget, setEditTarget] = useState<{ type: "org" | "group" | "user"; id?: string } | null>(null);

  const activeModal = editTarget ? (() => {
    if (editTarget.type === "org") return { title: "Бюджет организации", budget: orgBudget };
    if (editTarget.type === "group") {
      const g = groups.find(x => x.id === editTarget.id)!;
      return { title: `Бюджет группы: ${g.name}`, budget: g.budget };
    }
    const u = users.find(x => x.id === editTarget.id)!;
    return { title: `Бюджет: ${u.name}`, budget: u.budget };
  })() : null;

  function handleSave(b: typeof orgBudget) {
    if (!editTarget) return;
    if (editTarget.type === "org") setOrgBudget(b);
    else if (editTarget.type === "group") setGroups(prev => prev.map(g => g.id === editTarget.id ? { ...g, budget: b } : g));
    else setUsers(prev => prev.map(u => u.id === editTarget.id ? { ...u, budget: b } : u));
    setEditTarget(null);
  }

  const orgPct = orgBudget ? Math.min(100, (orgSpent / orgBudget.amount) * 100) : null;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-bold text-slate-900">Бюджеты</h1>
        <p className="text-sm text-slate-500 mt-0.5">Трёхуровневое управление расходами: организация → группа → пользователь</p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-8">
        {/* Level 1 — Org */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</div>
            <h2 className="text-base font-semibold text-slate-800">Уровень организации</h2>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-semibold text-slate-900">Arcane Platform</div>
                <div className="text-xs text-slate-400">Общий лимит расходов</div>
              </div>
              <button onClick={() => setEditTarget({ type: "org" })} className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors">Изменить</button>
            </div>
            {orgBudget && orgPct !== null ? (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-slate-800">${orgSpent.toFixed(2)}</span>
                  <span className="text-slate-400">${orgBudget.amount} / {PERIOD_LABELS[orgBudget.period]}</span>
                </div>
                <ProgressBar value={orgPct} alert={orgBudget.alertThreshold} />
                <div className="flex items-center justify-between mt-2 text-xs">
                  <span className="text-slate-400">{orgPct.toFixed(1)}% использовано</span>
                  <span className={`px-1.5 py-0.5 rounded-full font-medium ${ACTION_COLORS[orgBudget.actionOnExceed]}`}>{ACTION_LABELS[orgBudget.actionOnExceed]}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">Без лимита · ${orgSpent.toFixed(2)} потрачено</div>
            )}
          </div>
        </div>

        {/* Level 2 — Groups */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">2</div>
            <h2 className="text-base font-semibold text-slate-800">Уровень групп</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {groups.map(g => (
              <BudgetCard
                key={g.id}
                name={g.name}
                initials={g.name[0]}
                color={g.color}
                spent={g.spent}
                budget={g.budget}
                subtitle={`${ADMIN_USERS.filter(u => g.memberIds.includes(u.id)).length} участников`}
                onEdit={() => setEditTarget({ type: "group", id: g.id })}
              />
            ))}
          </div>
        </div>

        {/* Level 3 — Users */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs flex items-center justify-center font-bold">3</div>
            <h2 className="text-base font-semibold text-slate-800">Уровень пользователей</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map(u => {
              const group = groups.find(g => g.id === u.groupId);
              return (
                <BudgetCard
                  key={u.id}
                  name={u.name}
                  initials={u.avatarInitials}
                  color={u.avatarColor}
                  spent={u.spent}
                  budget={u.budget}
                  subtitle={group?.name}
                  onEdit={() => setEditTarget({ type: "user", id: u.id })}
                />
              );
            })}
          </div>
        </div>
      </div>

      {editTarget && activeModal && (
        <EditModal
          title={activeModal.title}
          budget={activeModal.budget}
          onClose={() => setEditTarget(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
