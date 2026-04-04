// AnalyticsPage — Design: Dark analytical dashboard, monochrome + accent palette
// Typography: JetBrains Mono for numbers, system-ui for labels
// Layout: Asymmetric grid — wide charts left, KPI column right
// Charts: Recharts with custom dark theme, subtle gradients, no chartjunk

import { useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { MOCK_PROJECTS, DASHBOARD_DAILY, MODELS } from "@/lib/mockData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, AreaChart, Area, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, BarChart2, Users, Zap, DollarSign, Activity, Clock } from "lucide-react";

// ── Color palette ────────────────────────────────────────────────────────────
const ACCENT = "#3B82F6";
const COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899", "#84CC16"];

const AGENT_META: Record<string, { label: string; emoji: string; color: string }> = {
  orchestrator: { label: "Оркестратор", emoji: "🎯", color: "#8B5CF6" },
  planner:      { label: "Планировщик", emoji: "📋", color: "#3B82F6" },
  coder:        { label: "Кодер",        emoji: "💻", color: "#10B981" },
  reviewer:     { label: "Ревьюер",      emoji: "🔍", color: "#F59E0B" },
  researcher:   { label: "Исследователь",emoji: "🔬", color: "#06B6D4" },
  writer:       { label: "Писатель",     emoji: "✍️", color: "#EC4899" },
  analyst:      { label: "Аналитик",     emoji: "📊", color: "#F97316" },
  tester:       { label: "Тестировщик",  emoji: "🧪", color: "#EF4444" },
};

const MODE_META: Record<string, { label: string; color: string }> = {
  normal:     { label: "Обычный",    color: "#6B7280" },
  collective: { label: "Коллектив",  color: "#8B5CF6" },
  auto:       { label: "AUTO",       color: "#3B82F6" },
  manual:     { label: "MANUAL",     color: "#6B7280" },
  top:        { label: "ТОП",        color: "#F59E0B" },
  optimum:    { label: "ОПТИМУМ",    color: "#10B981" },
  light:      { label: "ЛАЙТ",       color: "#06B6D4" },
  free:       { label: "БЕСПЛАТНО",  color: "#84CC16" },
};

// ── Custom tooltip ───────────────────────────────────────────────────────────
const DarkTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl text-[11px]">
      {label && <div className="text-zinc-400 mb-1">{label}</div>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color || p.fill }} />
          <span className="text-zinc-300">{p.name}:</span>
          <span className="text-white font-mono font-semibold">
            {typeof p.value === "number" && p.name?.includes("$") ? `$${p.value.toFixed(4)}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, trend, icon: Icon, color }: {
  label: string; value: string; sub?: string;
  trend?: "up" | "down" | "flat"; icon: any; color: string;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-zinc-500";
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={13} style={{ color }} />
        </div>
      </div>
      <div className="font-mono text-2xl font-bold text-white">{value}</div>
      {sub && (
        <div className={`flex items-center gap-1 text-[11px] ${trendColor}`}>
          <TrendIcon size={11} />
          <span>{sub}</span>
        </div>
      )}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionTitle({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-[13px] font-semibold text-zinc-200">{children}</h3>
      {sub && <p className="text-[11px] text-zinc-500 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Enrich MOCK_PROJECTS with synthetic agent/mode data for demo ──────────────
function enrichedTasks() {
  const modes = ["auto", "optimum", "top", "light", "normal", "manual", "collective", "free"];
  const agentSets: Record<string, string[]> = {
    auto:       ["orchestrator", "coder", "researcher"],
    optimum:    ["planner", "coder", "reviewer"],
    top:        ["orchestrator", "planner", "coder", "reviewer", "researcher"],
    light:      ["coder", "writer"],
    normal:     ["coder"],
    manual:     ["analyst", "coder"],
    collective: ["orchestrator", "planner", "coder", "reviewer", "analyst"],
    free:       ["coder"],
  };
  return MOCK_PROJECTS.flatMap(p =>
    p.tasks.map((t, i) => {
      const mode = t.chatMode || modes[i % modes.length];
      const agents = t.usedAgents?.map(a => a.agentId) || agentSets[mode] || ["coder"];
      return { ...t, chatMode: mode, resolvedAgents: agents };
    })
  );
}

export default function AnalyticsPage() {
  const { state } = useApp();
  const [period, setPeriod] = useState<"7d" | "30d" | "all">("7d");

  const tasks = useMemo(() => enrichedTasks(), []);

  // ── Agent popularity ─────────────────────────────────────────────────────
  const agentPopularity = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      t.resolvedAgents.forEach(a => { counts[a] = (counts[a] || 0) + 1; });
    });
    return Object.entries(counts)
      .map(([id, count]) => ({
        id, count,
        label: AGENT_META[id]?.label || id,
        emoji: AGENT_META[id]?.emoji || "🤖",
        color: AGENT_META[id]?.color || ACCENT,
      }))
      .sort((a, b) => b.count - a.count);
  }, [tasks]);

  // ── Cost by mode ─────────────────────────────────────────────────────────
  const costByMode = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    tasks.forEach(t => {
      const m = t.chatMode || "normal";
      if (!map[m]) map[m] = { total: 0, count: 0 };
      map[m].total += t.cost;
      map[m].count += 1;
    });
    return Object.entries(map).map(([mode, { total, count }]) => ({
      mode,
      label: MODE_META[mode]?.label || mode,
      avg: parseFloat((total / count).toFixed(4)),
      total: parseFloat(total.toFixed(4)),
      count,
      color: MODE_META[mode]?.color || ACCENT,
    })).sort((a, b) => b.avg - a.avg);
  }, [tasks]);

  // ── Task volume over time (use DASHBOARD_DAILY) ───────────────────────────
  const volumeData = DASHBOARD_DAILY.map(d => ({ ...d, cost: parseFloat(d.cost.toFixed(2)) }));

  // ── Model usage distribution ──────────────────────────────────────────────
  const modelUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => { counts[t.model] = (counts[t.model] || 0) + 1; });
    return Object.entries(counts)
      .map(([modelId, count]) => {
        const m = MODELS.find(x => x.id === modelId);
        return { id: modelId, name: m?.name || modelId, count, color: m?.color || ACCENT };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [tasks]);

  // ── Status distribution ───────────────────────────────────────────────────
  const statusData = useMemo(() => {
    const map: Record<string, number> = { done: 0, running: 0, error: 0, warning: 0, idle: 0 };
    tasks.forEach(t => { map[t.status] = (map[t.status] || 0) + 1; });
    const colors: Record<string, string> = {
      done: "#10B981", running: "#3B82F6", error: "#EF4444", warning: "#F59E0B", idle: "#6B7280"
    };
    const labels: Record<string, string> = {
      done: "Готово", running: "В работе", error: "Ошибка", warning: "Внимание", idle: "Ожидание"
    };
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([status, count]) => ({ status, label: labels[status], count, color: colors[status] }));
  }, [tasks]);

  // ── Radar: agent coverage by mode ────────────────────────────────────────
  const radarData = useMemo(() => {
    const agents = Object.keys(AGENT_META);
    const topModes = ["top", "optimum", "auto"];
    const agentSets: Record<string, string[]> = {
      top:     ["orchestrator", "planner", "coder", "reviewer", "researcher"],
      optimum: ["planner", "coder", "reviewer"],
      auto:    ["orchestrator", "coder", "researcher"],
    };
    return agents.map(a => {
      const row: Record<string, any> = { agent: AGENT_META[a].label };
      topModes.forEach(m => { row[m] = agentSets[m]?.includes(a) ? 1 : 0; });
      return row;
    });
  }, []);

  // ── KPI summary ──────────────────────────────────────────────────────────
  const totalCost = tasks.reduce((s, t) => s + t.cost, 0);
  const totalTasks = tasks.length;
  const avgCost = totalCost / totalTasks;
  const doneRate = Math.round((tasks.filter(t => t.status === "done").length / totalTasks) * 100);
  const uniqueAgents = new Set(tasks.flatMap(t => t.resolvedAgents)).size;

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart2 size={16} className="text-blue-400" />
          <span className="text-[14px] font-semibold">Аналитика</span>
          <span className="text-[11px] text-zinc-500">агенты · режимы · стоимость</span>
        </div>
        <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-0.5">
          {(["7d", "30d", "all"] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all ${
                period === p ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {p === "7d" ? "7 дней" : p === "30d" ? "30 дней" : "Всё время"}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 space-y-8">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Всего задач"    value={String(totalTasks)} sub="+3 за неделю" trend="up"   icon={Activity}    color="#3B82F6" />
          <KpiCard label="Общие расходы"  value={`$${totalCost.toFixed(2)}`} sub="-12% vs прошлая" trend="down" icon={DollarSign}  color="#10B981" />
          <KpiCard label="Средняя задача" value={`$${avgCost.toFixed(3)}`} sub="оптимально" trend="flat" icon={Zap}         color="#F59E0B" />
          <KpiCard label="Успешность"     value={`${doneRate}%`} sub={`${uniqueAgents} агентов`} trend="up" icon={Users}       color="#8B5CF6" />
        </div>

        {/* Row 1: Agent popularity + Cost trend */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Agent popularity — bar */}
          <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <SectionTitle sub="Сколько раз каждый агент участвовал в задачах">
              Популярность агентов
            </SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={agentPopularity} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  type="category" dataKey="label" width={90}
                  tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false}
                />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="count" name="Задач" radius={[0, 4, 4, 0]}>
                  {agentPopularity.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Status donut */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <SectionTitle sub="Распределение статусов задач">Статусы задач</SectionTitle>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={statusData} cx="50%" cy="50%"
                  innerRadius={50} outerRadius={80}
                  dataKey="count" nameKey="label"
                  paddingAngle={3}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
              {statusData.map(s => (
                <div key={s.status} className="flex items-center gap-1.5 text-[10px] text-zinc-400">
                  <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  {s.label} ({s.count})
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Row 2: Cost by mode + Volume trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Average cost by mode */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <SectionTitle sub="Средняя стоимость одной задачи по режиму запуска">
              Средняя стоимость по режимам
            </SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={costByMode} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false}
                  tickFormatter={v => `$${v}`}
                />
                <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="avg" name="Ср. стоимость $" radius={[4, 4, 0, 0]}>
                  {costByMode.map((entry) => (
                    <Cell key={entry.mode} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Mode summary table */}
            <div className="mt-3 grid grid-cols-3 gap-1">
              {costByMode.slice(0, 6).map(m => (
                <div key={m.mode} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.color }} />
                  <span className="text-zinc-400 truncate">{m.label}</span>
                  <span className="text-zinc-300 font-mono ml-auto">${m.avg}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Volume + cost trend */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <SectionTitle sub="Количество задач и расходы по дням">
              Динамика нагрузки
            </SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={volumeData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="gradTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="tasks" orientation="left"  tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="cost"  orientation="right" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                <Tooltip content={<DarkTooltip />} />
                <Area yAxisId="tasks" type="monotone" dataKey="tasks" name="Задач"    stroke="#3B82F6" fill="url(#gradTasks)" strokeWidth={2} dot={false} />
                <Area yAxisId="cost"  type="monotone" dataKey="cost"  name="Расходы $" stroke="#10B981" fill="url(#gradCost)"  strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 3: Model usage + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Model usage pie */}
          <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <SectionTitle sub="Какие LLM используются чаще всего">Использование моделей</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={modelUsage} cx="50%" cy="50%"
                  outerRadius={80} dataKey="count" nameKey="name"
                  paddingAngle={2}
                >
                  {modelUsage.map((entry, i) => (
                    <Cell key={entry.id} fill={entry.color || COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-1">
              {modelUsage.map((m, i) => (
                <div key={m.id} className="flex items-center gap-2 text-[10px]">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color || COLORS[i % COLORS.length] }} />
                  <span className="text-zinc-400 flex-1 truncate">{m.name}</span>
                  <span className="text-zinc-300 font-mono">{m.count} зад.</span>
                  <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      background: m.color || COLORS[i % COLORS.length],
                      width: `${(m.count / modelUsage[0].count) * 100}%`
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Radar: agent coverage by mode */}
          <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <SectionTitle sub="Какие агенты задействованы в каждом режиме">
              Покрытие агентов по режимам
            </SectionTitle>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#27272a" />
                <PolarAngleAxis dataKey="agent" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
                <Radar name="ТОП"     dataKey="top"     stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} strokeWidth={2} />
                <Radar name="ОПТИМУМ" dataKey="optimum" stroke="#10B981" fill="#10B981" fillOpacity={0.15} strokeWidth={2} />
                <Radar name="AUTO"    dataKey="auto"    stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.15} strokeWidth={2} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", color: "#a1a1aa" }}
                  formatter={(v) => <span style={{ color: "#a1a1aa" }}>{v}</span>}
                />
                <Tooltip content={<DarkTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Row 4: Cost efficiency table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
          <SectionTitle sub="Полная разбивка расходов и эффективности по режимам">
            Таблица эффективности режимов
          </SectionTitle>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Режим", "Задач", "Общий расход", "Ср. стоимость", "Мин.", "Макс.", "Агентов"].map(h => (
                    <th key={h} className="text-left text-zinc-500 font-medium py-2 pr-4 uppercase tracking-wider text-[10px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {costByMode.map(m => {
                  const modeTasks = tasks.filter(t => t.chatMode === m.mode);
                  const costs = modeTasks.map(t => t.cost);
                  const minCost = Math.min(...costs);
                  const maxCost = Math.max(...costs);
                  const agentCount = new Set(modeTasks.flatMap(t => t.resolvedAgents)).size;
                  return (
                    <tr key={m.mode} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                          <span className="text-zinc-200 font-medium">{m.label}</span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-zinc-300">{m.count}</td>
                      <td className="py-2.5 pr-4 font-mono text-zinc-300">${m.total}</td>
                      <td className="py-2.5 pr-4">
                        <span className="font-mono font-semibold" style={{ color: m.color }}>${m.avg}</span>
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-zinc-500">${minCost.toFixed(4)}</td>
                      <td className="py-2.5 pr-4 font-mono text-zinc-500">${maxCost.toFixed(4)}</td>
                      <td className="py-2.5 pr-4 font-mono text-zinc-400">{agentCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="h-6" />
      </div>
    </div>
  );
}
