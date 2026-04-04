// AnalyticsPage — Design: Dark analytical dashboard, monochrome + accent palette
// Typography: JetBrains Mono for numbers, system-ui for labels
// Layout: Asymmetric grid — wide charts left, KPI column right
// Charts: Recharts with custom dark theme, subtle gradients, no chartjunk

import { useMemo, useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { MOCK_PROJECTS, DASHBOARD_DAILY, MODELS } from "@/lib/mockData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, AreaChart, Area, Legend,
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, BarChart2, Users, Zap, DollarSign,
  Activity, Filter, X, ChevronDown, Calendar, CheckSquare, Square,
} from "lucide-react";

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

const STATUS_META: Record<string, { label: string; color: string }> = {
  done:    { label: "Готово",    color: "#10B981" },
  running: { label: "В работе", color: "#3B82F6" },
  error:   { label: "Ошибка",   color: "#EF4444" },
  warning: { label: "Внимание", color: "#F59E0B" },
  idle:    { label: "Ожидание", color: "#6B7280" },
};

// ── Date presets ─────────────────────────────────────────────────────────────
type DatePreset = "today" | "7d" | "30d" | "90d" | "custom";
const DATE_PRESETS: { id: DatePreset; label: string }[] = [
  { id: "today", label: "Сегодня" },
  { id: "7d",    label: "7 дней" },
  { id: "30d",   label: "30 дней" },
  { id: "90d",   label: "90 дней" },
  { id: "custom",label: "Период" },
];

function getPresetRange(preset: DatePreset): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (preset === "today") { from.setHours(0, 0, 0, 0); }
  else if (preset === "7d")  { from.setDate(from.getDate() - 7); }
  else if (preset === "30d") { from.setDate(from.getDate() - 30); }
  else if (preset === "90d") { from.setDate(from.getDate() - 90); }
  else { from.setDate(from.getDate() - 30); }
  return { from, to };
}

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
            {typeof p.value === "number" && (p.name?.includes("$") || p.name?.includes("Расход"))
              ? `$${p.value.toFixed(4)}`
              : p.value}
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

// ── Enrich MOCK_PROJECTS with synthetic agent/mode/date data for demo ─────────
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
  // Spread tasks across last 30 days for demo
  const now = new Date("2026-04-04");
  return MOCK_PROJECTS.flatMap((p, pi) =>
    p.tasks.map((t, i) => {
      const mode = t.chatMode || modes[(pi * 3 + i) % modes.length];
      const agents = t.usedAgents?.map(a => a.agentId) || agentSets[mode] || ["coder"];
      const daysAgo = (pi * 5 + i * 3) % 30;
      const taskDate = new Date(now);
      taskDate.setDate(taskDate.getDate() - daysAgo);
      return {
        ...t,
        chatMode: mode,
        resolvedAgents: agents,
        projectId: p.id,
        projectName: p.name,
        taskDate,
      };
    })
  );
}

// ── Filter chip ───────────────────────────────────────────────────────────────
function FilterChip({ label, color, active, onClick }: {
  label: string; color: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
        active
          ? "border-transparent text-white"
          : "border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400 bg-transparent"
      }`}
      style={active ? { background: color, borderColor: color } : {}}
    >
      {active ? <CheckSquare size={10} /> : <Square size={10} />}
      {label}
    </button>
  );
}

// ── Active filter badge ───────────────────────────────────────────────────────
function ActiveFilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 text-blue-300 rounded-full text-[10px]">
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors">
        <X size={9} />
      </button>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  // ── Filter state ─────────────────────────────────────────────────────────
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [showProjectDrop, setShowProjectDrop] = useState(false);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  const allTasks = useMemo(() => enrichedTasks(), []);

  // ── Compute date range ───────────────────────────────────────────────────
  const dateRange = useMemo(() => {
    if (datePreset === "custom" && customFrom && customTo) {
      return { from: new Date(customFrom), to: new Date(customTo + "T23:59:59") };
    }
    return getPresetRange(datePreset);
  }, [datePreset, customFrom, customTo]);

  // ── Apply filters ────────────────────────────────────────────────────────
  const tasks = useMemo(() => {
    return allTasks.filter(t => {
      // Date filter
      if (t.taskDate < dateRange.from || t.taskDate > dateRange.to) return false;
      // Status filter
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(t.status)) return false;
      // Project filter
      if (selectedProject !== "all" && t.projectId !== selectedProject) return false;
      // Agent filter — task must include ALL selected agents
      if (selectedAgents.length > 0 && !selectedAgents.every(a => t.resolvedAgents.includes(a))) return false;
      return true;
    });
  }, [allTasks, dateRange, selectedStatuses, selectedProject, selectedAgents]);

  const toggleStatus = (s: string) =>
    setSelectedStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const toggleAgent = (a: string) =>
    setSelectedAgents(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const clearAllFilters = () => {
    setDatePreset("30d");
    setSelectedStatuses([]);
    setSelectedProject("all");
    setSelectedAgents([]);
    setCustomFrom("");
    setCustomTo("");
  };

  const hasActiveFilters = selectedStatuses.length > 0 || selectedProject !== "all" || datePreset !== "30d" || selectedAgents.length > 0;

  // ── Derived chart data ───────────────────────────────────────────────────
  const agentPopularity = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => { t.resolvedAgents.forEach(a => { counts[a] = (counts[a] || 0) + 1; }); });
    return Object.entries(counts)
      .map(([id, count]) => ({ id, count, label: AGENT_META[id]?.label || id, color: AGENT_META[id]?.color || ACCENT }))
      .sort((a, b) => b.count - a.count);
  }, [tasks]);

  const costByMode = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    tasks.forEach(t => {
      const m = t.chatMode || "normal";
      if (!map[m]) map[m] = { total: 0, count: 0 };
      map[m].total += t.cost;
      map[m].count += 1;
    });
    return Object.entries(map).map(([mode, { total, count }]) => ({
      mode, label: MODE_META[mode]?.label || mode,
      avg: parseFloat((total / count).toFixed(4)),
      total: parseFloat(total.toFixed(4)),
      count, color: MODE_META[mode]?.color || ACCENT,
    })).sort((a, b) => b.avg - a.avg);
  }, [tasks]);

  // Volume over time — group filtered tasks by date
  const volumeData = useMemo(() => {
    const map: Record<string, { date: string; tasks: number; cost: number }> = {};
    // Use DASHBOARD_DAILY as base, then overlay filtered task counts
    DASHBOARD_DAILY.forEach(d => { map[d.date] = { date: d.date, tasks: 0, cost: 0 }; });
    tasks.forEach(t => {
      const key = t.taskDate.toLocaleDateString("ru", { day: "numeric", month: "short" });
      if (!map[key]) map[key] = { date: key, tasks: 0, cost: 0 };
      map[key].tasks += 1;
      map[key].cost = parseFloat((map[key].cost + t.cost).toFixed(2));
    });
    return Object.values(map).slice(-14); // last 14 data points
  }, [tasks]);

  const modelUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => { counts[t.model] = (counts[t.model] || 0) + 1; });
    return Object.entries(counts)
      .map(([modelId, count]) => {
        const m = MODELS.find(x => x.id === modelId);
        return { id: modelId, name: m?.name || modelId, count, color: m?.color || ACCENT };
      })
      .sort((a, b) => b.count - a.count).slice(0, 6);
  }, [tasks]);

  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    tasks.forEach(t => { map[t.status] = (map[t.status] || 0) + 1; });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([status, count]) => ({
        status, count,
        label: STATUS_META[status]?.label || status,
        color: STATUS_META[status]?.color || "#6B7280",
      }));
  }, [tasks]);

  const radarData = useMemo(() => {
    const agents = Object.keys(AGENT_META);
    const agentSets: Record<string, string[]> = {
      top:     ["orchestrator", "planner", "coder", "reviewer", "researcher"],
      optimum: ["planner", "coder", "reviewer"],
      auto:    ["orchestrator", "coder", "researcher"],
    };
    return agents.map(a => {
      const row: Record<string, any> = { agent: AGENT_META[a].label };
      ["top", "optimum", "auto"].forEach(m => { row[m] = agentSets[m]?.includes(a) ? 1 : 0; });
      return row;
    });
  }, []);

  // ── KPI ──────────────────────────────────────────────────────────────────
  const totalCost = tasks.reduce((s, t) => s + t.cost, 0);
  const totalTasks = tasks.length;
  const avgCost = totalTasks > 0 ? totalCost / totalTasks : 0;
  const doneRate = totalTasks > 0 ? Math.round((tasks.filter(t => t.status === "done").length / totalTasks) * 100) : 0;
  const uniqueAgents = new Set(tasks.flatMap(t => t.resolvedAgents)).size;

  const projects = MOCK_PROJECTS;

  return (
    <div className="h-full overflow-y-auto bg-zinc-950 text-zinc-100">
      {/* ── Header ── */}
      <div className="sticky top-0 z-20 bg-zinc-950/95 backdrop-blur border-b border-zinc-800">
        {/* Title row */}
        <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BarChart2 size={16} className="text-blue-400" />
            <span className="text-[14px] font-semibold">Аналитика</span>
            <span className="text-[11px] text-zinc-500">агенты · режимы · стоимость</span>
            {totalTasks > 0 && (
              <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 rounded-full text-[10px] font-mono">
                {totalTasks} задач
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X size={11} />
              Сбросить фильтры
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div className="px-6 pb-3 flex flex-wrap items-center gap-3">
          {/* Date preset pills */}
          <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-0.5">
            {DATE_PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => {
                  setDatePreset(p.id);
                  if (p.id === "custom") setShowDatePicker(v => !v);
                  else setShowDatePicker(false);
                }}
                className={`px-3 py-1 rounded-md text-[11px] font-medium transition-all flex items-center gap-1 ${
                  datePreset === p.id ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {p.id === "custom" && <Calendar size={10} />}
                {p.label}
              </button>
            ))}
          </div>

          {/* Custom date range inputs */}
          {datePreset === "custom" && (
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5">
              <input
                type="date"
                value={customFrom}
                onChange={e => setCustomFrom(e.target.value)}
                className="bg-transparent text-[11px] text-zinc-300 outline-none [color-scheme:dark]"
              />
              <span className="text-zinc-600 text-[11px]">—</span>
              <input
                type="date"
                value={customTo}
                onChange={e => setCustomTo(e.target.value)}
                className="bg-transparent text-[11px] text-zinc-300 outline-none [color-scheme:dark]"
              />
            </div>
          )}

          {/* Divider */}
          <div className="w-px h-5 bg-zinc-800" />

          {/* Status filters */}
          <div className="flex items-center gap-1.5">
            <Filter size={11} className="text-zinc-600" />
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider mr-1">Статус</span>
            {Object.entries(STATUS_META).map(([id, meta]) => (
              <FilterChip
                key={id}
                label={meta.label}
                color={meta.color}
                active={selectedStatuses.includes(id)}
                onClick={() => toggleStatus(id)}
              />
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-zinc-800" />

          {/* Project filter */}
          <div className="relative">
            <button
              onClick={() => setShowProjectDrop(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-[11px] text-zinc-300 hover:border-zinc-600 transition-colors"
            >
              <span>{selectedProject === "all" ? "Все проекты" : projects.find(p => p.id === selectedProject)?.name || "Проект"}</span>
              <ChevronDown size={10} className="text-zinc-500" />
            </button>
            {showProjectDrop && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProjectDrop(false)} />
                <div className="absolute top-full left-0 mt-1 z-20 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
                  <button
                    onClick={() => { setSelectedProject("all"); setShowProjectDrop(false); }}
                    className={`w-full text-left px-3 py-2 text-[11px] hover:bg-zinc-800 transition-colors ${selectedProject === "all" ? "text-blue-400" : "text-zinc-300"}`}
                  >
                    Все проекты
                  </button>
                  {projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setSelectedProject(p.id); setShowProjectDrop(false); }}
                      className={`w-full text-left px-3 py-2 text-[11px] hover:bg-zinc-800 transition-colors ${selectedProject === p.id ? "text-blue-400" : "text-zinc-300"}`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Agent filter */}
          <div className="w-full flex items-center gap-1.5 flex-wrap pt-1 border-t border-zinc-800/60">
            <div className="flex items-center gap-1.5 mr-1">
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">Агент</span>
            </div>
            {Object.entries(AGENT_META).map(([id, meta]) => (
              <FilterChip
                key={id}
                label={`${meta.emoji} ${meta.label}`}
                color={meta.color}
                active={selectedAgents.includes(id)}
                onClick={() => toggleAgent(id)}
              />
            ))}
            {selectedAgents.length > 0 && (
              <button
                onClick={() => setSelectedAgents([])}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors ml-1 flex items-center gap-0.5"
              >
                <X size={9} /> Сбросить агентов
              </button>
            )}
          </div>

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {selectedStatuses.map(s => (
                <ActiveFilterBadge
                  key={s}
                  label={STATUS_META[s]?.label || s}
                  onRemove={() => toggleStatus(s)}
                />
              ))}
              {selectedAgents.map(a => (
                <ActiveFilterBadge
                  key={a}
                  label={`${AGENT_META[a]?.emoji || ""} ${AGENT_META[a]?.label || a}`}
                  onRemove={() => toggleAgent(a)}
                />
              ))}
              {selectedProject !== "all" && (
                <ActiveFilterBadge
                  label={projects.find(p => p.id === selectedProject)?.name || selectedProject}
                  onRemove={() => setSelectedProject("all")}
                />
              )}
              {datePreset !== "30d" && (
                <ActiveFilterBadge
                  label={DATE_PRESETS.find(p => p.id === datePreset)?.label || datePreset}
                  onRemove={() => setDatePreset("30d")}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {totalTasks === 0 && (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
          <BarChart2 size={32} className="mb-3 opacity-40" />
          <p className="text-[13px]">Нет задач по выбранным фильтрам</p>
          <button onClick={clearAllFilters} className="mt-3 text-[11px] text-blue-400 hover:text-blue-300 transition-colors">
            Сбросить фильтры
          </button>
        </div>
      )}

      {totalTasks > 0 && (
        <div className="p-6 space-y-8">
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Задач в выборке" value={String(totalTasks)} sub={`из ${allTasks.length} всего`} trend="flat" icon={Activity}   color="#3B82F6" />
            <KpiCard label="Общие расходы"   value={`$${totalCost.toFixed(2)}`} sub="в выбранном периоде" trend="flat" icon={DollarSign} color="#10B981" />
            <KpiCard label="Средняя задача"  value={`$${avgCost.toFixed(3)}`} sub="средняя стоимость" trend="flat" icon={Zap}         color="#F59E0B" />
            <KpiCard label="Успешность"      value={`${doneRate}%`} sub={`${uniqueAgents} агентов`} trend="flat" icon={Users}       color="#8B5CF6" />
          </div>

          {/* Row 1: Agent popularity + Status donut */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <SectionTitle sub="Сколько раз каждый агент участвовал в задачах выборки">
                Популярность агентов
              </SectionTitle>
              {agentPopularity.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-zinc-600 text-[12px]">Нет данных</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={agentPopularity} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" width={90} tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="count" name="Задач" radius={[0, 4, 4, 0]}>
                      {agentPopularity.map(e => <Cell key={e.id} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <SectionTitle sub="Распределение статусов в выборке">Статусы задач</SectionTitle>
              {statusData.length === 0 ? (
                <div className="h-[180px] flex items-center justify-center text-zinc-600 text-[12px]">Нет данных</div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="count" nameKey="label" paddingAngle={3}>
                      {statusData.map(e => <Cell key={e.status} fill={e.color} />)}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
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
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <SectionTitle sub="Средняя стоимость одной задачи по режиму запуска">
                Средняя стоимость по режимам
              </SectionTitle>
              {costByMode.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-zinc-600 text-[12px]">Нет данных</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={costByMode} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                    <Tooltip content={<DarkTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                    <Bar dataKey="avg" name="Ср. стоимость $" radius={[4, 4, 0, 0]}>
                      {costByMode.map(e => <Cell key={e.mode} fill={e.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <SectionTitle sub="Количество задач и расходы по дням в выбранном периоде">
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
                  <Area yAxisId="tasks" type="monotone" dataKey="tasks" name="Задач"      stroke="#3B82F6" fill="url(#gradTasks)" strokeWidth={2} dot={false} />
                  <Area yAxisId="cost"  type="monotone" dataKey="cost"  name="Расходы $"  stroke="#10B981" fill="url(#gradCost)"  strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Row 3: Model usage + Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <SectionTitle sub="Какие LLM используются в выборке">Использование моделей</SectionTitle>
              {modelUsage.length === 0 ? (
                <div className="h-[200px] flex items-center justify-center text-zinc-600 text-[12px]">Нет данных</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={modelUsage} cx="50%" cy="50%" outerRadius={80} dataKey="count" nameKey="name" paddingAngle={2}>
                      {modelUsage.map((e, i) => <Cell key={e.id} fill={e.color || COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<DarkTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="space-y-1 mt-1">
                {modelUsage.map((m, i) => (
                  <div key={m.id} className="flex items-center gap-2 text-[10px]">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.color || COLORS[i % COLORS.length] }} />
                    <span className="text-zinc-400 flex-1 truncate">{m.name}</span>
                    <span className="text-zinc-300 font-mono">{m.count} зад.</span>
                    <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        background: m.color || COLORS[i % COLORS.length],
                        width: `${(m.count / (modelUsage[0]?.count || 1)) * 100}%`
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

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
                  <Legend wrapperStyle={{ fontSize: "11px" }} formatter={(v) => <span style={{ color: "#a1a1aa" }}>{v}</span>} />
                  <Tooltip content={<DarkTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Efficiency table */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
            <SectionTitle sub="Полная разбивка расходов и эффективности по режимам в выборке">
              Таблица эффективности режимов
            </SectionTitle>
            {costByMode.length === 0 ? (
              <div className="py-8 text-center text-zinc-600 text-[12px]">Нет данных по выбранным фильтрам</div>
            ) : (
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
            )}
          </div>

          <div className="h-6" />
        </div>
      )}
    </div>
  );
}
