/**
 * Arcane 2 — Models Registry Page
 * Design: dark sidebar layout, spec-accurate data from mockData.ts
 * Shows all 13 LLM models + 6 image generation models with filters, search, pricing
 */

import { useState } from "react";
import { MODELS, IMAGE_MODELS } from "@/lib/mockData";
import {
  Search, Brain, Image, Zap, Star, DollarSign, Cpu, Globe,
  CheckCircle2, ChevronRight, Info, SortAsc, SortDesc
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ── Tier config ─────────────────────────────────────────────────────────────
const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  genius:   { label: "Флагман",  color: "#D4A574", bg: "rgba(212,165,116,0.12)" },
  standard: { label: "Стандарт", color: "#7EB8DA", bg: "rgba(126,184,218,0.12)" },
  optimum:  { label: "Оптимум",  color: "#82C9A5", bg: "rgba(130,201,165,0.12)" },
  fast:     { label: "Быстрый",  color: "#E8D5A3", bg: "rgba(232,213,163,0.12)" },
  free:     { label: "Free",     color: "#76B900", bg: "rgba(118,185,0,0.12)" },
};

// ── Category filters ─────────────────────────────────────────────────────────
const LLM_FILTERS = [
  { id: "all",      label: "Все" },
  { id: "genius",   label: "Флагман" },
  { id: "standard", label: "Стандарт" },
  { id: "optimum",  label: "Оптимум" },
  { id: "fast",     label: "Быстрые" },
  { id: "free",     label: "Бесплатные" },
];

const IMAGE_FILTERS = [
  { id: "all",           label: "Все" },
  { id: "photorealistic",label: "Фото" },
  { id: "artistic",      label: "Арт" },
  { id: "typography",    label: "Типографика" },
  { id: "svg",           label: "SVG" },
  { id: "fast",          label: "Быстрые" },
  { id: "stock",         label: "Стоковые" },
];

// ── Transport badge ───────────────────────────────────────────────────────────
function TransportBadge({ transport }: { transport: string }) {
  if (transport === "native") {
    return (
      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
        style={{ background: "rgba(100,200,255,0.12)", color: "#64C8FF" }}>
        NATIVE
      </span>
    );
  }
  return (
    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
      style={{ background: "rgba(150,150,150,0.1)", color: "var(--color-muted-foreground, #888)" }}>
      OpenRouter
    </span>
  );
}

// ── LLM Card ─────────────────────────────────────────────────────────────────
function LLMCard({ model: m }: { model: typeof MODELS[0] }) {
  const tier = TIER_CONFIG[m.tier] || TIER_CONFIG.standard;
  const costLabel = m.isFree
    ? "Free"
    : `$${m.costIn}/$${m.costOut}/M`;

  return (
    <div className="rounded-xl border border-border/60 p-4 hover:border-border transition-all duration-200 hover:shadow-md group"
      style={{ background: "var(--color-card, hsl(var(--card)))" }}>

      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-bold flex-shrink-0"
            style={{ background: tier.bg, color: tier.color }}>
            {m.icon}
          </div>
          <div>
            <div className="font-semibold text-[13px] text-foreground leading-tight">{m.name}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{m.provider}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
            style={{ background: tier.bg, color: tier.color }}>
            {tier.label.toUpperCase()}
          </span>
          {m.isFree && (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(118,185,0,0.12)", color: "#76B900" }}>
              FREE
            </span>
          )}
        </div>
      </div>

      {/* Superpower */}
      <div className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
        {m.superpower}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <DollarSign size={10} className="text-emerald-400 flex-shrink-0" />
          <span className="font-mono text-[10px] text-foreground/70">{costLabel}</span>
        </div>
        {m.context && (
          <div className="flex items-center gap-1.5">
            <Brain size={10} className="text-blue-400 flex-shrink-0" />
            <span className="font-mono text-[10px] text-foreground/70">
              {m.context >= 1000 ? `${m.context}K` : `${m.context}K`} ctx
            </span>
          </div>
        )}
        {m.swe !== null && m.swe !== undefined && (
          <div className="flex items-center gap-1.5">
            <Star size={10} className="text-yellow-400 flex-shrink-0" />
            <span className="font-mono text-[10px] text-foreground/70">SWE {m.swe}%</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Globe size={10} className="text-purple-400 flex-shrink-0" />
          <TransportBadge transport={m.transport} />
        </div>
      </div>

      {/* Use button */}
      <button className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 opacity-0 group-hover:opacity-100"
        style={{ background: tier.bg, color: tier.color }}
        onClick={() => {}}>
        Выбрать модель
        <ChevronRight size={11} />
      </button>
    </div>
  );
}

// ── Image Model Card ──────────────────────────────────────────────────────────
function ImageModelCard({ model: m }: { model: typeof IMAGE_MODELS[0] }) {
  const costLabel = m.isFree
    ? "Free"
    : m.costPerImage !== null
      ? `$${m.costPerImage}/шт`
      : "—";

  return (
    <div className="rounded-xl border border-border/60 p-4 hover:border-border transition-all duration-200 hover:shadow-md group"
      style={{ background: "var(--color-card, hsl(var(--card)))" }}>

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${m.color}22` }}>
            <Image size={16} style={{ color: m.color }} />
          </div>
          <div>
            <div className="font-semibold text-[13px] text-foreground leading-tight">{m.name}</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{m.provider}</div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {m.isFree ? (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: "rgba(118,185,0,0.12)", color: "#76B900" }}>
              FREE
            </span>
          ) : (
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={{ background: `${m.color}22`, color: m.color }}>
              {m.style.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Superpower */}
      <div className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
        {m.superpower}
      </div>

      {/* Cost */}
      <div className="flex items-center gap-1.5">
        <DollarSign size={10} style={{ color: m.color }} className="flex-shrink-0" />
        <span className="font-mono text-[10px] text-foreground/70">{costLabel}</span>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ModelsPage() {
  const [tab, setTab] = useState<"llm" | "image">("llm");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "cost" | "swe">("name");
  const [sortAsc, setSortAsc] = useState(true);

  const toggleSort = (key: typeof sortBy) => {
    if (sortBy === key) setSortAsc(v => !v);
    else { setSortBy(key); setSortAsc(true); }
  };

  // Filter + sort LLM models
  const filteredLLM = MODELS
    .filter(m => {
      const q = search.toLowerCase();
      const matchSearch = m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q) || m.id.includes(q);
      const matchFilter = filter === "all"
        || (filter === "free" && m.isFree)
        || m.tier === filter;
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name);
      else if (sortBy === "cost") cmp = (a.costIn || 0) - (b.costIn || 0);
      else if (sortBy === "swe") cmp = ((b.swe ?? 0) - (a.swe ?? 0));
      return sortAsc ? cmp : -cmp;
    });

  // Filter image models
  const filteredImages = IMAGE_MODELS
    .filter(m => {
      const q = search.toLowerCase();
      const matchSearch = m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q);
      const matchFilter = filter === "all"
        || (filter === "stock" && m.isFree)
        || m.style === filter;
      return matchSearch && matchFilter;
    });

  const currentFilters = tab === "llm" ? LLM_FILTERS : IMAGE_FILTERS;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Cpu size={15} className="text-primary" />
            </div>
            <div>
              <h1 className="font-bold text-[18px] text-foreground">Реестр моделей</h1>
              <p className="text-[12px] text-muted-foreground">
                {MODELS.length} LLM · {IMAGE_MODELS.length} генерация изображений
              </p>
            </div>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
            <button
              onClick={() => { setTab("llm"); setFilter("all"); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
                tab === "llm" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Brain size={13} />
              Языковые модели
              <span className="ml-1 text-[10px] font-mono px-1 py-0.5 rounded bg-primary/10 text-primary">{MODELS.length}</span>
            </button>
            <button
              onClick={() => { setTab("image"); setFilter("all"); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[12px] font-semibold transition-colors ${
                tab === "image" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              <Image size={13} />
              Генерация изображений
              <span className="ml-1 text-[10px] font-mono px-1 py-0.5 rounded bg-primary/10 text-primary">{IMAGE_MODELS.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div className="flex-shrink-0 px-6 py-3 flex items-center gap-3 border-b border-border/50">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск моделей..."
            className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-input border border-border rounded-lg outline-none focus:border-primary/40 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-1">
          {currentFilters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                filter === f.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort (LLM only) */}
        {tab === "llm" && (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[11px] text-muted-foreground">Сорт:</span>
            {(["name", "cost", "swe"] as const).map(key => (
              <button
                key={key}
                onClick={() => toggleSort(key)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${
                  sortBy === key ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                }`}>
                {key === "name" ? "Имя" : key === "cost" ? "Цена" : "SWE"}
                {sortBy === key && (sortAsc ? <SortAsc size={10} /> : <SortDesc size={10} />)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Grid ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tab === "llm" ? (
          <>
            {filteredLLM.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Brain size={32} className="mb-2 opacity-30" />
                <p className="text-[13px]">Модели не найдены</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredLLM.map(m => <LLMCard key={m.id} model={m} />)}
              </div>
            )}

            {/* Spec info footer */}
            <div className="mt-6 p-4 rounded-xl border border-border/50 bg-muted/20">
              <div className="flex items-start gap-3">
                <Info size={14} className="text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  <strong className="text-foreground/70">Транспортный слой:</strong> OpenRouter — default transport для большинства моделей.
                  Нативные адаптеры (NATIVE) для critical paths: OpenAI Responses API, Anthropic extended thinking, Manus API.
                  Нативные возможности недоступны через OpenRouter.
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {filteredImages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Image size={32} className="mb-2 opacity-30" />
                <p className="text-[13px]">Модели не найдены</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredImages.map(m => <ImageModelCard key={m.id} model={m} />)}
              </div>
            )}

            {/* Pricing comparison */}
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Модель</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Провайдер</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Цена/шт</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Суперсила</th>
                    <th className="text-left py-2 px-3 text-muted-foreground font-medium">Стиль</th>
                  </tr>
                </thead>
                <tbody>
                  {IMAGE_MODELS.map(m => (
                    <tr key={m.id} className="border-b border-border/30 hover:bg-accent/20 transition-colors">
                      <td className="py-2 px-3 font-semibold text-foreground">{m.name}</td>
                      <td className="py-2 px-3 text-muted-foreground">{m.provider}</td>
                      <td className="py-2 px-3 font-mono">
                        {m.isFree ? (
                          <span className="text-emerald-400">Free</span>
                        ) : (
                          <span className="text-foreground/80">${m.costPerImage}</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{m.superpower}</td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: `${m.color}22`, color: m.color }}>
                          {m.style}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
