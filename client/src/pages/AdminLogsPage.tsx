// AdminLogsPage — Full audit log with filters and CSV export
import { useState, useMemo } from "react";
import { AUDIT_LOGS, ADMIN_USERS, ADMIN_GROUPS, type AuditLogEntry } from "@/lib/mockData";

const ACTION_LABELS: Record<string, string> = {
  task_created: "Задача создана",
  task_deleted: "Задача удалена",
  task_completed: "Задача завершена",
  user_created: "Пользователь создан",
  user_blocked: "Пользователь заблокирован",
  user_unblocked: "Пользователь разблокирован",
  budget_exceeded: "Бюджет превышен",
  budget_updated: "Бюджет изменён",
  permission_changed: "Права изменены",
  login: "Вход в систему",
  logout: "Выход из системы",
  model_used: "Модель использована",
};

const ACTION_COLORS: Record<string, string> = {
  task_created: "bg-blue-100 text-blue-700",
  task_deleted: "bg-red-100 text-red-700",
  task_completed: "bg-green-100 text-green-700",
  user_created: "bg-purple-100 text-purple-700",
  user_blocked: "bg-red-100 text-red-700",
  user_unblocked: "bg-green-100 text-green-700",
  budget_exceeded: "bg-red-100 text-red-700",
  budget_updated: "bg-amber-100 text-amber-700",
  permission_changed: "bg-purple-100 text-purple-700",
  login: "bg-slate-100 text-slate-600",
  logout: "bg-slate-100 text-slate-600",
  model_used: "bg-cyan-100 text-cyan-700",
};

const PAGE_SIZE = 20;

export default function AdminLogsPage() {
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return AUDIT_LOGS.filter(log => {
      if (userFilter !== "all" && log.userId !== userFilter) return false;
      if (actionFilter !== "all" && log.status !== actionFilter) return false;
      if (dateFrom && log.timestamp < dateFrom) return false;
      if (dateTo && log.timestamp > dateTo + "T23:59:59") return false;
      if (search) {
        const q = search.toLowerCase();
        const user = ADMIN_USERS.find(u => u.id === log.userId);
        if (!user?.name.toLowerCase().includes(q) && !log.projectName?.toLowerCase().includes(q) && !log.taskName?.toLowerCase().includes(q)) return false;
      }
      return true;
    }).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [search, userFilter, actionFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function exportCSV() {
    const header = "Время,Пользователь,Группа,Действие,Проект,Модель,Стоимость,Детали";
    const rows = filtered.map(log => {
      const user = ADMIN_USERS.find(u => u.id === log.userId);
      const group = ADMIN_GROUPS.find(g => g.id === user?.groupId);
      return [
        log.timestamp,
        user?.name ?? log.userId,
        group?.name ?? "",
        ACTION_LABELS[log.status] ?? log.status,
        log.projectName ?? "",
        log.model ?? "",
        log.cost != null ? `$${log.cost.toFixed(4)}` : "",
        log.taskName ?? "",
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "audit_log.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  function resetFilters() {
    setSearch(""); setUserFilter("all"); setActionFilter("all"); setDateFrom(""); setDateTo(""); setPage(1);
  }

  const hasFilters = search || userFilter !== "all" || actionFilter !== "all" || dateFrom || dateTo;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Аудит-лог</h1>
            <p className="text-sm text-slate-500 mt-0.5">{filtered.length} записей</p>
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
            ⬇ Экспорт CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <input className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Поиск..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />

          <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={userFilter} onChange={e => { setUserFilter(e.target.value); setPage(1); }}>
            <option value="all">Все пользователи</option>
            {ADMIN_USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>

          <select className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
            <option value="all">Все действия</option>
            {Object.entries(ACTION_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>


          <div className="flex items-center gap-1.5">
            <input type="date" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
            <span className="text-slate-400 text-sm">—</span>
            <input type="date" className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
          </div>

          {hasFilters && (
            <button onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Время</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Пользователь</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Действие</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Проект / Задача</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Модель</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Стоимость</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Детали</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(log => {
                const user = ADMIN_USERS.find(u => u.id === log.userId);
                const group = ADMIN_GROUPS.find(g => g.id === user?.groupId);
                return (
                  <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="px-4 py-3">
                      {user ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: user.avatarColor }}>{user.avatarInitials}</div>
                          <div>
                            <div className="text-slate-800 font-medium text-xs">{user.name}</div>
                            {group && <div className="text-slate-400 text-xs">{group.name}</div>}
                          </div>
                        </div>
                      ) : <span className="text-slate-400 text-xs">{log.userId}</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {ACTION_LABELS[log.status] ?? log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {log.projectName && <div className="font-medium">{log.projectName}</div>}
                      {log.taskName && <div className="text-slate-400 truncate max-w-[180px]">{log.taskName}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{log.model ?? "—"}</td>
                    <td className="px-4 py-3 text-right text-xs font-mono">
                      {log.cost != null ? <span className="text-slate-700">${log.cost.toFixed(4)}</span> : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px] truncate">{log.mode ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {paginated.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <div className="text-4xl mb-2">📋</div>
              <div>Записи не найдены</div>
              {hasFilters && <button onClick={resetFilters} className="mt-2 text-blue-500 text-sm hover:underline">Сбросить фильтры</button>}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-xs text-slate-400">Страница {page} из {totalPages} · {filtered.length} записей</div>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">← Назад</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-3 py-1.5 text-xs border rounded-lg transition-colors ${p === page ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:bg-slate-50"}`}>
                    {p}
                  </button>
                );
              })}
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">Вперёд →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
