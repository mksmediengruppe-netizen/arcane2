// === DASHBOARD — Spending analytics, model distribution, project costs ===
import { useApp } from "@/contexts/AppContext";
import { DASHBOARD_DAILY, DASHBOARD_MODELS, DASHBOARD_PROJECTS, formatCostShort } from "@/lib/mockData";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { TrendingUp, DollarSign, Zap, Clock, Download } from "lucide-react";
import { toast } from "sonner";

const CHART_COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4"];

function StatCard({ icon, label, value, sub, color = "text-foreground" }: {
  icon: React.ReactNode; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-md bg-primary/10 text-primary">{icon}</div>
        <span className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <div className={`text-[22px] font-semibold mono ${color}`}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-xl">
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-[12px]">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-foreground mono">{typeof p.value === "number" && p.name === "cost" ? `$${p.value.toFixed(2)}` : p.value}</span>
        </div>
      ))}
    </div>
  );
};

function exportCSV(state: ReturnType<typeof useApp>["state"]) {
  const rows: string[] = [
    "\uFEFFПроект,Задача,Статус,Стоимость ($),Длительность,Модель,Дата"
  ];
  state.projects.forEach(p => {
    p.tasks.forEach(t => {
      rows.push(`"${p.name}","${t.name}",${t.status},${t.cost.toFixed(4)},${t.duration},${t.model},${t.createdAt}`);
    });
  });
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `arcane2-report-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Dashboard() {
  const { state } = useApp();
  const totalSpent = state.projects.reduce((s, p) => s + p.tasks.reduce((ts, t) => ts + t.cost, 0), 0);
  const totalTasks = state.projects.reduce((s, p) => s + p.tasks.length, 0);
  const avgCostPerTask = totalTasks > 0 ? totalSpent / totalTasks : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-foreground">Дашборд</h2>
            <p className="text-[12px] text-muted-foreground">Аналитика расходов и использования за последние 7 дней</p>
          </div>
          <button onClick={() => exportCSV(state)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Download size={13} /> Экспорт CSV
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard icon={<DollarSign size={14} />} label="Всего потрачено" value={`$${totalSpent.toFixed(2)}`} sub="за все время" />
          <StatCard icon={<Zap size={14} />} label="Задач выполнено" value={String(totalTasks)} sub={`в ${state.projects.length} проектах`} />
          <StatCard icon={<TrendingUp size={14} />} label="Ср. стоимость задачи" value={`$${avgCostPerTask.toFixed(3)}`} sub="на задачу" />
          <StatCard icon={<Clock size={14} />} label="Гонок проведено" value={String(state.races.length)} sub="Dog Racing" />
        </div>

        {/* Daily spending chart */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-[12px] font-semibold text-foreground mb-4">Расходы по дням</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={DASHBOARD_DAILY} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.008 265)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.52 0.01 265)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "oklch(0.52 0.01 265)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="cost" stroke="#3B82F6" fill="url(#costGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Model distribution */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[12px] font-semibold text-foreground mb-4">Расходы по моделям</h3>
            <div className="flex gap-4">
              <ResponsiveContainer width="50%" height={140}>
                <PieChart>
                  <Pie data={DASHBOARD_MODELS} dataKey="cost" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2}>
                    {DASHBOARD_MODELS.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5 py-2">
                {DASHBOARD_MODELS.map((m, i) => (
                  <div key={m.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-[11px] text-foreground flex-1 truncate">{m.name}</span>
                    <span className="mono text-[10px] text-muted-foreground">${m.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Project costs */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-[12px] font-semibold text-foreground mb-4">Расходы по проектам</h3>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={DASHBOARD_PROJECTS} layout="vertical" margin={{ top: 0, right: 10, bottom: 0, left: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "oklch(0.52 0.01 265)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "oklch(0.52 0.01 265)" }} axisLine={false} tickLine={false} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="cost" fill="#3B82F6" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dog Racing stats */}
        {state.races.length > 0 && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-[12px] font-semibold text-foreground">🐕 Dog Racing — Последние гонки</h3>
            </div>
            <div className="p-4 space-y-2">
              {state.races.slice(-3).reverse().map((race, i) => (
                <div key={race.id} className="flex items-center gap-4 py-2 border-b border-border/30 last:border-0">
                  <span className="text-[10px] text-muted-foreground/50 w-4">{i + 1}</span>
                  <div className="flex-1">
                    <div className="text-[11px] text-foreground">{race.task.slice(0, 60)}{race.task.length > 60 ? "..." : ""}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">{race.runners.length} моделей участвовало</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-medium text-emerald-400">🏆 {race.runners[0]?.modelId}</div>
                    <div className="mono text-[10px] text-muted-foreground">{race.runners[0]?.score.toFixed(1)}/10</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Connectors */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="text-[12px] font-semibold text-foreground">Коннекторы</h3>
            <span className="text-[10px] text-muted-foreground">Интеграции с внешними сервисами</span>
          </div>
          <div className="p-4 grid grid-cols-4 gap-3">
            {[
              { name: "GitHub",   icon: "🐛", status: "connected",    desc: "3 репозитория" },
              { name: "Jira",     icon: "📋", status: "connected",    desc: "2 проекта" },
              { name: "Slack",    icon: "💬", status: "disconnected", desc: "Не подключён" },
              { name: "Notion",   icon: "📝", status: "disconnected", desc: "Не подключён" },
            ].map(c => (
              <div key={c.name}
                onClick={() => c.status === "connected"
                  ? toast(`${c.icon} ${c.name}`, { description: `Подключено: ${c.desc}` })
                  : toast(`${c.icon} ${c.name}`, { description: "Интеграция недоступна в демо" })}
                className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg hover:border-primary/30 transition-colors cursor-pointer">
                <span className="text-[18px]">{c.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-foreground">{c.name}</div>
                  <div className="text-[10px] text-muted-foreground">{c.desc}</div>
                </div>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.status === "connected" ? "bg-emerald-400" : "bg-zinc-600"}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Tasks table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-[12px] font-semibold text-foreground">Последние задачи</h3>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Задача</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Проект</th>
                <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Модель</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Стоимость</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Время</th>
                <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Статус</th>
              </tr>
            </thead>
            <tbody>
              {state.projects.flatMap(p => p.tasks.map(t => ({ ...t, projectName: p.name }))).slice(0, 8).map(task => (
                <tr key={task.id} className="border-b border-border/30 hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-2.5 text-foreground max-w-[200px] truncate">{task.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{task.projectName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{task.model}</td>
                  <td className="px-4 py-2.5 text-right mono text-foreground">{formatCostShort(task.cost)}</td>
                  <td className="px-4 py-2.5 text-right mono text-muted-foreground">{task.duration}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      task.status === "done" ? "bg-emerald-400/10 text-emerald-400" :
                      task.status === "running" ? "bg-blue-400/10 text-blue-400" :
                      task.status === "error" ? "bg-red-400/10 text-red-400" :
                      task.status === "warning" ? "bg-yellow-400/10 text-yellow-400" :
                      "bg-zinc-600/10 text-zinc-400"
                    }`}>
                      {task.status}
                    </span>
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
