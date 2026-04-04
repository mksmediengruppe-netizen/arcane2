/**
 * Arcane 2 — Consolidation Page (Коллективный разум)
 * Design: dark, spec §8 — multi-model parallel run → consensus + unique insights + contradictions
 * Select 2–5 models, submit prompt, see structured result with attribution
 */

import { useState, useRef, useEffect } from "react";
import { MODELS, formatCost } from "@/lib/mockData";
import {
  Brain, Play, Square, ChevronDown, ChevronUp, Check, X,
  Lightbulb, AlertTriangle, GitMerge, Zap, Clock, DollarSign,
  Copy, RotateCcw, Users
} from "lucide-react";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ModelResult {
  modelId: string;
  output: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  latency: number; // ms
  done: boolean;
}

interface ConsolidatedResult {
  consensus: string;
  uniqueInsights: Array<{ modelId: string; insight: string }>;
  contradictions: Array<{ topic: string; positions: Array<{ modelId: string; position: string }> }>;
  recommendation: string;
  totalCost: number;
  totalLatency: number;
}

// ── Mock outputs per model ─────────────────────────────────────────────────────
const MOCK_OUTPUTS: Record<string, string[]> = {
  "claude-opus-4.6": [
    "Архитектурное решение требует глубокого анализа. Рекомендую микросервисную архитектуру с event-driven подходом. Ключевые компоненты: API Gateway, Message Queue (Kafka), отдельные сервисы для каждого домена. Это обеспечит масштабируемость и независимость деплоя.",
    "С точки зрения безопасности необходимо реализовать zero-trust модель: mTLS между сервисами, JWT с коротким TTL, RBAC с принципом наименьших привилегий.",
  ],
  "gpt-5.4": [
    "Оптимальный подход — начать с монолита и постепенно выделять сервисы по мере роста нагрузки. Преждевременная микросервисная архитектура создаёт операционную сложность без реальной пользы на ранних этапах.",
    "Для аутентификации рекомендую OAuth 2.0 + PKCE с refresh token rotation. Это стандарт индустрии, хорошо поддерживается библиотеками.",
  ],
  "claude-sonnet-4.6": [
    "Предлагаю гибридный подход: модульный монолит с чёткими границами между доменами. При необходимости легко разбить на микросервисы без переписывания бизнес-логики.",
    "Важно сразу заложить observability: distributed tracing (OpenTelemetry), централизованное логирование (ELK), метрики (Prometheus + Grafana).",
  ],
  "gemini-3.1-pro": [
    "С точки зрения SWE-bench архитектура должна быть тестируемой. Рекомендую hexagonal architecture (ports & adapters) — бизнес-логика полностью изолирована от инфраструктуры, 100% покрытие unit-тестами.",
    "Для CI/CD: GitHub Actions → Docker → Kubernetes. GitOps с ArgoCD для управления конфигурацией.",
  ],
  "deepseek-v3.2": [
    "Самое дешёвое и эффективное решение: FastAPI + PostgreSQL + Redis. Простая архитектура, низкие операционные расходы, высокая производительность.",
    "Для кэширования использовать Redis с TTL-стратегией. Индексы PostgreSQL покрывают 90% запросов без дополнительных оптимизаций.",
  ],
  "minimax-m2.5": [
    "Open-weight модели позволяют развернуть решение on-premise без зависимости от облачных провайдеров. Рекомендую Llama 3 для внутренних задач.",
    "Для векторного поиска: pgvector в PostgreSQL покрывает большинство use cases без отдельной vector DB.",
  ],
};

function getOutput(modelId: string): string {
  const outputs = MOCK_OUTPUTS[modelId] || MOCK_OUTPUTS["claude-sonnet-4.6"];
  return outputs[Math.floor(Math.random() * outputs.length)];
}

// ── Model selector chip ───────────────────────────────────────────────────────
function ModelChip({
  model, selected, onToggle, disabled
}: {
  model: typeof MODELS[0];
  selected: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled && !selected}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[12px] font-medium transition-all duration-150 ${
        selected
          ? "border-primary/50 bg-primary/10 text-foreground"
          : disabled
            ? "border-border/30 text-muted-foreground/40 cursor-not-allowed"
            : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground hover:bg-accent/30"
      }`}>
      <span className="text-base leading-none" style={{ color: selected ? model.color : undefined }}>
        {model.icon}
      </span>
      <span>{model.name}</span>
      {model.isFree && (
        <span className="text-[9px] font-mono px-1 py-0.5 rounded"
          style={{ background: "rgba(118,185,0,0.15)", color: "#76B900" }}>
          FREE
        </span>
      )}
      {selected && <Check size={11} className="text-primary ml-auto" />}
    </button>
  );
}

// ── Result section ─────────────────────────────────────────────────────────────
function ResultSection({
  icon, title, color, children
}: {
  icon: React.ReactNode;
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden"
      style={{ background: "var(--color-card, hsl(var(--card)))" }}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/20 transition-colors"
        onClick={() => setOpen(v => !v)}>
        <div className="flex items-center gap-2.5">
          <span style={{ color }}>{icon}</span>
          <span className="font-semibold text-[13px] text-foreground">{title}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-border/40">
          {children}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ConsolidationPage() {
  const [prompt, setPrompt] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(["claude-sonnet-4.6", "gpt-5.4", "gemini-3.1-pro"]);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ModelResult[]>([]);
  const [consolidated, setConsolidated] = useState<ConsolidatedResult | null>(null);
  const [phase, setPhase] = useState<"idle" | "running" | "consolidating" | "done">("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_MODELS = 5;
  const canAddMore = selectedIds.length < MAX_MODELS;

  const toggleModel = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < MAX_MODELS ? [...prev, id] : prev
    );
  };

  const getModelById = (id: string) => MODELS.find(m => m.id === id)!;

  const handleRun = async () => {
    if (!prompt.trim() || selectedIds.length < 2) {
      toast.error("Введите промпт и выберите минимум 2 модели");
      return;
    }

    setRunning(true);
    setPhase("running");
    setResults([]);
    setConsolidated(null);

    // Simulate parallel model runs
    const pending: ModelResult[] = selectedIds.map(id => ({
      modelId: id,
      output: "",
      tokensIn: 0,
      tokensOut: 0,
      cost: 0,
      latency: 0,
      done: false,
    }));
    setResults([...pending]);

    // Stagger completions
    const delays = selectedIds.map(() => 1500 + Math.random() * 3000);
    const promises = selectedIds.map((id, i) =>
      new Promise<void>(resolve => {
        setTimeout(() => {
          const m = getModelById(id);
          const tokensIn = 400 + Math.floor(Math.random() * 200);
          const tokensOut = 800 + Math.floor(Math.random() * 600);
          const cost = m.isFree ? 0 : (tokensIn * m.costIn + tokensOut * m.costOut) / 1_000_000;
          const output = getOutput(id);

          setResults(prev => prev.map((r, idx) =>
            idx === i ? { ...r, output, tokensIn, tokensOut, cost, latency: delays[i], done: true } : r
          ));
          resolve();
        }, delays[i]);
      })
    );

    await Promise.all(promises);

    // Consolidation phase
    setPhase("consolidating");
    await new Promise(r => setTimeout(r, 1200));

    // Build consolidated result
    const totalCost = pending.reduce((sum, _, i) => {
      const m = getModelById(selectedIds[i]);
      const tokensIn = 400 + Math.floor(Math.random() * 200);
      const tokensOut = 800 + Math.floor(Math.random() * 600);
      return sum + (m.isFree ? 0 : (tokensIn * m.costIn + tokensOut * m.costOut) / 1_000_000);
    }, 0);

    const cons: ConsolidatedResult = {
      consensus: `Все ${selectedIds.length} моделей сходятся в том, что задача требует структурированного подхода с учётом масштабируемости и поддерживаемости. Ключевые принципы: чёткое разделение ответственности, тестируемость архитектуры, observability с первого дня.`,
      uniqueInsights: [
        { modelId: selectedIds[0], insight: "Акцент на event-driven архитектуру для асинхронной обработки" },
        { modelId: selectedIds[1] || selectedIds[0], insight: "Рекомендует начать с монолита и постепенно выделять сервисы" },
        ...(selectedIds.length > 2 ? [{ modelId: selectedIds[2], insight: "Hexagonal architecture для максимальной тестируемости" }] : []),
      ],
      contradictions: [
        {
          topic: "Начальная архитектура",
          positions: [
            { modelId: selectedIds[0], position: "Сразу микросервисы" },
            { modelId: selectedIds[1] || selectedIds[0], position: "Начать с монолита" },
          ],
        },
      ],
      recommendation: `На основе анализа ${selectedIds.length} моделей рекомендуется **модульный монолит** как стартовая точка с чёткими доменными границами. Это позволит быстро итерировать на ранних этапах и при необходимости разбить на микросервисы без переписывания бизнес-логики. Приоритет: тесты, CI/CD, observability.`,
      totalCost: totalCost * selectedIds.length,
      totalLatency: Math.max(...delays),
    };

    setConsolidated(cons);
    setPhase("done");
    setRunning(false);
  };

  const handleStop = () => {
    setRunning(false);
    setPhase("idle");
    setResults([]);
    setConsolidated(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Скопировано");
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
            <Users size={15} className="text-purple-400" />
          </div>
          <div>
            <h1 className="font-bold text-[18px] text-foreground">Коллективный разум</h1>
            <p className="text-[12px] text-muted-foreground">
              2–5 моделей параллельно → консолидированный ответ
            </p>
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

        {/* ── Prompt ── */}
        <div className="rounded-xl border border-border/60 p-4"
          style={{ background: "var(--color-card, hsl(var(--card)))" }}>
          <label className="block text-[12px] font-semibold text-muted-foreground mb-2">Промпт</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            disabled={running}
            placeholder="Опишите задачу для коллективного анализа..."
            rows={3}
            className="w-full text-[13px] bg-transparent text-foreground placeholder:text-muted-foreground/50 outline-none resize-none"
          />
        </div>

        {/* ── Model selector ── */}
        <div className="rounded-xl border border-border/60 p-4"
          style={{ background: "var(--color-card, hsl(var(--card)))" }}>
          <div className="flex items-center justify-between mb-3">
            <label className="text-[12px] font-semibold text-muted-foreground">
              Модели
              <span className="ml-2 font-mono text-primary">{selectedIds.length}/{MAX_MODELS}</span>
            </label>
            <span className="text-[11px] text-muted-foreground">Выберите 2–5 моделей</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {MODELS.map(m => (
              <ModelChip
                key={m.id}
                model={m}
                selected={selectedIds.includes(m.id)}
                onToggle={() => toggleModel(m.id)}
                disabled={!canAddMore}
              />
            ))}
          </div>
        </div>

        {/* ── Run / Stop button ── */}
        <div className="flex gap-3">
          {!running ? (
            <button
              onClick={handleRun}
              disabled={selectedIds.length < 2 || !prompt.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              <Play size={14} />
              Запустить ({selectedIds.length} моделей)
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-destructive/15 text-destructive hover:bg-destructive/25 transition-all">
              <Square size={14} />
              Остановить
            </button>
          )}
          {phase === "done" && (
            <button
              onClick={() => { setPhase("idle"); setResults([]); setConsolidated(null); setPrompt(""); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/30 transition-all">
              <RotateCcw size={13} />
              Новый запрос
            </button>
          )}
        </div>

        {/* ── Per-model results ── */}
        {results.length > 0 && (
          <div>
            <div className="text-[12px] font-semibold text-muted-foreground mb-2 flex items-center gap-2">
              <Zap size={12} className="text-yellow-400" />
              Параллельные ответы
              {phase === "consolidating" && (
                <span className="text-[11px] text-purple-400 animate-pulse ml-1">Консолидирую...</span>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {results.map(r => {
                const m = getModelById(r.modelId);
                if (!m) return null;
                return (
                  <div key={r.modelId}
                    className={`rounded-xl border p-4 transition-all duration-300 ${
                      r.done ? "border-border/60" : "border-border/30"
                    }`}
                    style={{ background: "var(--color-card, hsl(var(--card)))" }}>
                    {/* Model header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base" style={{ color: m.color }}>{m.icon}</span>
                        <span className="font-semibold text-[12px] text-foreground">{m.name}</span>
                      </div>
                      {r.done ? (
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                          <Clock size={9} />
                          {(r.latency / 1000).toFixed(1)}s
                          <DollarSign size={9} />
                          {m.isFree ? "Free" : formatCost(r.cost)}
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground animate-pulse">Генерирую...</span>
                      )}
                    </div>
                    {/* Output */}
                    {r.done ? (
                      <div className="text-[12px] text-foreground/80 leading-relaxed">
                        {r.output}
                      </div>
                    ) : (
                      <div className="h-12 flex items-center">
                        <div className="flex gap-1">
                          {[0, 1, 2].map(i => (
                            <div key={i}
                              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce"
                              style={{ animationDelay: `${i * 0.15}s` }} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Consolidated result ── */}
        {consolidated && phase === "done" && (
          <div className="space-y-3">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-border/50 p-3 text-center"
                style={{ background: "var(--color-card, hsl(var(--card)))" }}>
                <div className="text-[11px] text-muted-foreground mb-1">Моделей</div>
                <div className="font-bold text-[20px] text-foreground">{selectedIds.length}</div>
              </div>
              <div className="rounded-xl border border-border/50 p-3 text-center"
                style={{ background: "var(--color-card, hsl(var(--card)))" }}>
                <div className="text-[11px] text-muted-foreground mb-1">Итого</div>
                <div className="font-bold text-[20px] text-foreground font-mono">
                  {formatCost(consolidated.totalCost)}
                </div>
              </div>
              <div className="rounded-xl border border-border/50 p-3 text-center"
                style={{ background: "var(--color-card, hsl(var(--card)))" }}>
                <div className="text-[11px] text-muted-foreground mb-1">Время</div>
                <div className="font-bold text-[20px] text-foreground font-mono">
                  {(consolidated.totalLatency / 1000).toFixed(1)}s
                </div>
              </div>
            </div>

            {/* Consensus */}
            <ResultSection
              icon={<GitMerge size={15} />}
              title="Консенсус"
              color="#7EB8DA">
              <div className="pt-3 text-[13px] text-foreground/80 leading-relaxed">
                {consolidated.consensus}
              </div>
            </ResultSection>

            {/* Unique insights */}
            <ResultSection
              icon={<Lightbulb size={15} />}
              title="Уникальные инсайты"
              color="#F2C078">
              <div className="pt-3 space-y-2">
                {consolidated.uniqueInsights.map((ins, i) => {
                  const m = getModelById(ins.modelId);
                  return (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-base flex-shrink-0 mt-0.5" style={{ color: m?.color }}>
                        {m?.icon}
                      </span>
                      <div>
                        <span className="text-[10px] font-semibold text-muted-foreground">{m?.name}: </span>
                        <span className="text-[12px] text-foreground/80">{ins.insight}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ResultSection>

            {/* Contradictions */}
            {consolidated.contradictions.length > 0 && (
              <ResultSection
                icon={<AlertTriangle size={15} />}
                title="Противоречия"
                color="#E05A5A">
                <div className="pt-3 space-y-3">
                  {consolidated.contradictions.map((c, i) => (
                    <div key={i}>
                      <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">{c.topic}</div>
                      <div className="space-y-1.5">
                        {c.positions.map((p, j) => {
                          const m = getModelById(p.modelId);
                          return (
                            <div key={j} className="flex items-start gap-2">
                              <span className="text-sm flex-shrink-0" style={{ color: m?.color }}>{m?.icon}</span>
                              <span className="text-[12px] text-foreground/70">{p.position}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </ResultSection>
            )}

            {/* Recommendation */}
            <div className="rounded-xl border border-primary/30 p-4"
              style={{ background: "rgba(var(--color-primary-rgb, 99,102,241), 0.05)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Brain size={14} className="text-primary" />
                  <span className="font-semibold text-[13px] text-foreground">Итоговая рекомендация</span>
                </div>
                <button
                  onClick={() => handleCopy(consolidated.recommendation)}
                  className="p-1.5 rounded hover:bg-accent/30 text-muted-foreground hover:text-foreground transition-colors">
                  <Copy size={12} />
                </button>
              </div>
                <div className="text-[13px] text-foreground/80 leading-relaxed">
                {consolidated.recommendation}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
