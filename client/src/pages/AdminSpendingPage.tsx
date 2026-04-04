// AdminSpendingPage — Spending dashboard: top users, groups, models, limit alerts
import { useMemo } from "react";
import { ADMIN_USERS, ADMIN_GROUPS, AUDIT_LOGS } from "@/lib/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

function ProgressBar({ value, alert }: { value: number; alert: number }) {
  const color = value >= 100 ? "bg-red-500" : value >= alert ? "bg-amber-400" : "bg-blue-500";
  return (
    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

const CHART_COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#84CC16", "#EC4899"];

export default function AdminSpendingPage() {
  const totalSpent = useMemo(() => ADMIN_USERS.reduce((s, u) => s + u.spent, 0), []);

  // Top users by spending
  const topUsers = useMemo(() =>
    [...ADMIN_USERS].sort((a, b) => b.spent - a.spent).slice(0, 8).map(u => ({
      name: u.name.split(" ")[0],
      spent: u.spent,
      budget: u.budget?.amount ?? null,
      pct: u.budget ? (u.spent / u.budget.amount) * 100 : null,
      alert: u.budget?.alertThreshold ?? 80,
      color: u.avatarColor,
      initials: u.avatarInitials,
      fullName: u.name,
      group: ADMIN_GROUPS.find(g => g.id === u.groupId)?.name ?? "—",
    })), []);

  // Top groups by spending
  const topGroups = useMemo(() =>
    [...ADMIN_GROUPS].sort((a, b) => b.spent - a.spent).map(g => ({
      name: g.name,
      spent: g.spent,
      budget: g.budget?.amount ?? null,
      pct: g.budget ? (g.spent / g.budget.amount) * 100 : null,
      alert: g.budget?.alertThreshold ?? 80,
      color: g.color,
      memberCount: ADMIN_USERS.filter(u => g.memberIds.includes(u.id)).length,
    })), []);

  // Model usage from audit logs
  const modelUsage = useMemo(() => {
    const map: Record<string, { count: number; cost: number }> = {};
    AUDIT_LOGS.forEach(log => {
      if (!map[log.model]) map[log.model] = { count: 0, cost: 0 };
      map[log.model].count++;
      map[log.model].cost += log.cost;
    });
    return Object.entries(map).sort((a, b) => b[1].cost - a[1].cost).slice(0, 8).map(([name, v]) => ({ name, ...v }));
  }, []);

  // Alerts
  const alerts = useMemo(() => {
    const list: { type: "user" | "group"; name: string; pct: number; spent: number; limit: number; color: string }[] = [];
    ADMIN_USERS.forEach(u => {
      if (u.budget) {
        const pct = (u.spent / u.budget.amount) * 100;
        if (pct >= u.budget.alertThreshold) {
          list.push({ type: "user", name: u.name, pct, spent: u.spent, limit: u.budget.amount, color: u.avatarColor });
        }
      }
    });
    ADMIN_GROUPS.forEach(g => {
      if (g.budget) {
        const pct = (g.spent / g.budget.amount) * 100;
        if (pct >= g.budget.alertThreshold) {
          list.push({ type: "group", name: g.name, pct, spent: g.spent, limit: g.budget.amount, color: g.color });
        }
      }
    });
    return list.sort((a, b) => b.pct - a.pct);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-bold text-slate-900">Расходы</h1>
        <p className="text-sm text-slate-500 mt-0.5">Сводная панель расходов по пользователям, группам и моделям</p>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* KPI row */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Общие расходы", value: `$${totalSpent.toFixed(2)}`, sub: "все пользователи", color: "text-slate-900" },
            { label: "Активных пользователей", value: ADMIN_USERS.filter(u => u.status === "active").length, sub: "из " + ADMIN_USERS.length + " всего", color: "text-green-600" },
            { label: "Превышений лимита", value: alerts.filter(a => a.pct >= 100).length, sub: "требуют внимания", color: alerts.filter(a => a.pct >= 100).length > 0 ? "text-red-600" : "text-slate-400" },
            { label: "Предупреждений", value: alerts.filter(a => a.pct < 100).length, sub: "близко к лимиту", color: alerts.filter(a => a.pct < 100).length > 0 ? "text-amber-600" : "text-slate-400" },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
              <div className="text-xs font-medium text-slate-700 mt-0.5">{k.label}</div>
              <div className="text-xs text-slate-400">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-amber-500 text-lg">⚠</span>
              <h3 className="font-semibold text-amber-800 text-sm">Предупреждения о бюджете ({alerts.length})</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {alerts.map((a, i) => (
                <div key={i} className="bg-white rounded-lg p-3 border border-amber-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: a.color }}>{a.name[0]}</div>
                      <div>
                        <span className="text-xs font-medium text-slate-800">{a.name}</span>
                        <span className="ml-1.5 text-xs text-slate-400">{a.type === "user" ? "пользователь" : "группа"}</span>
                      </div>
                    </div>
                    <span className={`text-xs font-bold ${a.pct >= 100 ? "text-red-600" : "text-amber-600"}`}>{a.pct.toFixed(0)}%</span>
                  </div>
                  <ProgressBar value={a.pct} alert={80} />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>${a.spent.toFixed(2)} потрачено</span>
                    <span>лимит ${a.limit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts row */}
        <div className="grid grid-cols-2 gap-6">
          {/* Top users chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Топ пользователей по расходам</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={topUsers} layout="vertical" margin={{ left: 60, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={v => `$${v}`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={55} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Расходы"]} />
                <Bar dataKey="spent" radius={[0, 4, 4, 0]}>
                  {topUsers.map((u, i) => <Cell key={i} fill={u.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Model usage chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-800 text-sm mb-4">Расходы по моделям</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={modelUsage} layout="vertical" margin={{ left: 100, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tickFormatter={v => `$${v.toFixed(2)}`} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={95} />
                <Tooltip formatter={(v: number) => [`$${v.toFixed(4)}`, "Стоимость"]} />
                <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                  {modelUsage.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Users table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Детализация по пользователям</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Пользователь</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Группа</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Потрачено</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[160px]">Прогресс</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Лимит</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((u, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: u.color }}>{u.initials}</div>
                      <span className="font-medium text-slate-800 text-sm">{u.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{u.group}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-medium text-slate-800">${u.spent.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {u.pct !== null ? (
                      <div>
                        <ProgressBar value={u.pct} alert={u.alert} />
                        <div className="text-xs text-slate-400 mt-0.5">{u.pct.toFixed(1)}%</div>
                      </div>
                    ) : <span className="text-xs text-slate-400">Без лимита</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-400">
                    {u.budget !== null ? `$${u.budget}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Groups table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">Детализация по группам</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Группа</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Участников</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Потрачено</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide min-w-[160px]">Прогресс</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Лимит</th>
              </tr>
            </thead>
            <tbody>
              {topGroups.map((g, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: g.color }}>{g.name[0]}</div>
                      <span className="font-medium text-slate-800 text-sm">{g.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{g.memberCount}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm font-medium text-slate-800">${g.spent.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    {g.pct !== null ? (
                      <div>
                        <ProgressBar value={g.pct} alert={g.alert} />
                        <div className="text-xs text-slate-400 mt-0.5">{g.pct.toFixed(1)}%</div>
                      </div>
                    ) : <span className="text-xs text-slate-400">Без лимита</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-400">
                    {g.budget !== null ? `$${g.budget}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
