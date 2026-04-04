// Design: Refined Dark SaaS — Chat Panel
// Features: EmptyChat, Capability Badges, Stop button, Follow-up suggestions, Edit message, Reactions
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useApp } from "@/contexts/AppContext";
import { MODELS, formatCost, Message } from "@/lib/mockData";
import { getProjectCost } from "@/lib/store";
import {
  Send, ChevronDown, Brain, Zap, ChevronRight, Copy, RotateCcw,
  ThumbsUp, ThumbsDown, Square, Globe, Terminal, FileText,
  Image, Search, Pencil, Check, X, Plus, Mic, MicOff, Paperclip
} from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import EmptyChat from "./EmptyChat";
import LiveCodePreview from "./LiveCodePreview";

const TIER_LABELS: Record<string, string> = {
  fast: "Быстрый", standard: "Стандарт", genius: "Гений", optimum: "Оптимум"
};

const CHAT_MODES = [
  // ── Execution modes (spec §6.1) ─────────────────────────────────────────
  { id: "auto",       label: "AUTO",              icon: "⚡",  desc: "Система сама выбирает модель по задаче, сложности и бюджету" },
  { id: "top",        label: "ТОП",               icon: "🏆",  desc: "Лучшая модель для каждой роли, оптимально по цене" },
  { id: "optimum",    label: "ОПТИМУМ",           icon: "⚖️",  desc: "90% качества ТОП за 50% цены. Default." },
  { id: "lite",       label: "ЛАЙТ",              icon: "🪶",  desc: "Приемлемое качество за минимальную стоимость" },
  { id: "free",       label: "БЕСПЛАТНО",         icon: "🆓",  desc: "$0 за AI. Только Manus из подписки + Free модели" },
  { id: "manual",     label: "MANUAL",            icon: "🎛️",  desc: "Система предлагает, вы меняете любую модель для любой роли" },
  // ── Special modes ───────────────────────────────────────────────────────
  { id: "normal",     label: "Обычный",           icon: "💬",  desc: "Стандартный режим без специальных настроек" },
  { id: "collective", label: "Коллективный разум", icon: "🧠",  desc: "2–5 моделей параллельно → консолидированный ответ" },
];

const CAPABILITIES = [
  { id: "search",  icon: <Search size={11} />,   label: "Поиск",   color: "text-blue-400" },
  { id: "browser", icon: <Globe size={11} />,    label: "Браузер", color: "text-emerald-400" },
  { id: "ssh",     icon: <Terminal size={11} />, label: "SSH",     color: "text-yellow-400" },
  { id: "files",   icon: <FileText size={11} />, label: "Файлы",   color: "text-purple-400" },
  { id: "images",  icon: <Image size={11} />,    label: "Картинки",color: "text-pink-400" },
];

const FOLLOW_UP_SUGGESTIONS = [
  "Как оптимизировать производительность?",
  "Покажи пример использования",
  "Объясни подробнее шаг 2",
  "Добавь обработку ошибок",
  "Напиши тесты для этого кода",
];

const AGENT_STEPS_SEQUENCE = [
  { tool: "Browser",    icon: "🌐", action: "Открываю страницу документации...",       color: "text-blue-400" },
  { tool: "Browser",    icon: "🌐", action: "Извлекаю инструкции по установке...",     color: "text-blue-400" },
  { tool: "SSH",        icon: "💻", action: "Подключаюсь к серверу...",                    color: "text-emerald-400" },
  { tool: "SSH",        icon: "💻", action: "Выполняю: apt update && apt upgrade...",          color: "text-emerald-400" },
  { tool: "FileSystem", icon: "📁", action: "Создаю конфигурационный файл...",        color: "text-yellow-400" },
  { tool: "LLM",        icon: "🧠", action: "Генерирую итоговый отчёт...",                color: "text-purple-400" },
];

// Realistic per-step durations (ms) matching AGENT_STEPS_SEQUENCE order
const STEP_DURATIONS = [800, 1400, 300, 3200, 2100, 1800];
// Estimated cost per step in USD (Browser=scraping, SSH=compute, FileSystem=free, LLM=tokens)
const STEP_COSTS = [0.0012, 0.0018, 0.0004, 0.0085, 0.0031, 0.0124];
const formatStepCost = (usd: number) => `$${usd.toFixed(4)}`;

function StepTimer({ startedAt, finalMs }: { startedAt: number | null; finalMs: number | null }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (finalMs !== null) { setElapsed(finalMs); return; }
    if (startedAt === null) return;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(id);
  }, [startedAt, finalMs]);
  if (startedAt === null && finalMs === null) return null;
  const secs = (elapsed / 1000).toFixed(1);
  return (
    <span className="mono text-[10px] tabular-nums flex-shrink-0 text-muted-foreground/60">
      {secs}s
    </span>
  );
}

function TaskProgress({ progress }: { progress: number }) {
  const total = AGENT_STEPS_SEQUENCE.length;
  const doneCount = Math.floor(progress * total);
  const activeIdx = doneCount < total ? doneCount : -1;
  const isComplete = doneCount >= total;
  const [collapsed, setCollapsed] = useState(false);

  // Track when each step started and its final duration
  const [stepStartTimes, setStepStartTimes] = useState<(number | null)[]>(() => Array(total).fill(null));
  const [stepFinalMs, setStepFinalMs] = useState<(number | null)[]>(() => Array(total).fill(null));
  const prevActiveIdx = useRef(-1);

  // Total elapsed timer
  const totalStartRef = useRef<number | null>(null);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [totalFinal, setTotalFinal] = useState<number | null>(null);

  useEffect(() => {
    if (activeIdx === prevActiveIdx.current) return;
    const prev = prevActiveIdx.current;

    // Start total timer when first step begins
    if (prev === -1 && activeIdx === 0) {
      totalStartRef.current = Date.now();
    }

    // Finalise previous active step
    if (prev >= 0 && prev < total) {
      setStepFinalMs(arr => {
        const next = [...arr];
        next[prev] = STEP_DURATIONS[prev] ?? 1000;
        return next;
      });
    }
    // Start new active step
    if (activeIdx >= 0) {
      setStepStartTimes(arr => {
        const next = [...arr];
        next[activeIdx] = Date.now();
        return next;
      });
    }
    prevActiveIdx.current = activeIdx;
  }, [activeIdx, total]);

  // Freeze total timer when all steps complete
  useEffect(() => {
    if (isComplete && totalStartRef.current !== null && totalFinal === null) {
      setTotalFinal(STEP_DURATIONS.reduce((a, b) => a + b, 0));
    }
  }, [isComplete, totalFinal]);

  // Live tick for total timer
  useEffect(() => {
    if (totalFinal !== null || totalStartRef.current === null) return;
    const id = setInterval(() => {
      if (totalStartRef.current) setTotalElapsed(Date.now() - totalStartRef.current);
    }, 100);
    return () => clearInterval(id);
  }, [totalFinal]);

  const totalMs = totalFinal ?? totalElapsed;
  const totalSecs = totalMs > 0 ? (totalMs / 1000).toFixed(1) + 's' : null;

  return (
    <div className="mb-3 rounded-xl border border-border/60 bg-accent/20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/30 transition-colors">
        <span className="text-[12px] font-semibold text-foreground">Прогресс задачи</span>
        <div className="flex items-center gap-2">
          {totalSecs && (
            <span className={`mono text-[11px] tabular-nums ${
              isComplete ? 'text-emerald-400' : 'text-blue-400 animate-pulse'
            }`}>
              {totalSecs}
            </span>
          )}
          {doneCount > 0 && (
            <span className={`mono text-[11px] tabular-nums ${
              isComplete ? 'text-emerald-400/80' : 'text-muted-foreground/70'
            }`}>
              ${STEP_COSTS.slice(0, doneCount).reduce((a, b) => a + b, 0).toFixed(4)}
            </span>
          )}
          <span className="mono text-[11px] text-muted-foreground">
            {Math.min(doneCount + (activeIdx >= 0 ? 1 : 0), total)} / {total}
          </span>
          <ChevronDown size={12} className={`text-muted-foreground transition-transform ${collapsed ? "-rotate-90" : ""}`} />
        </div>
      </button>

      {/* Steps list */}
      {!collapsed && (
        <div className="px-4 pb-3 space-y-0">
          {AGENT_STEPS_SEQUENCE.map((step, i) => {
            const isDone = i < doneCount;
            const isActive = i === activeIdx;
            return (
              <div key={i} className={`flex items-start gap-3 py-1.5 ${
                i < AGENT_STEPS_SEQUENCE.length - 1 ? "border-b border-border/20" : ""
              }`}>
                {/* Status indicator */}
                {isDone ? (
                  <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check size={9} className="text-emerald-400" />
                  </span>
                ) : isActive ? (
                  <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </span>
                ) : (
                  <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border border-border/60 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20" />
                  </span>
                )}
                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className={`text-[12px] leading-snug ${
                    isDone ? "text-foreground/60 line-through decoration-muted-foreground/30" :
                    isActive ? "text-foreground font-medium" :
                    "text-muted-foreground/50"
                  }`}>
                    {step.action.replace("...", "")}
                  </div>
                  {isActive && (
                    <div className="text-[10px] text-muted-foreground/60 mt-0.5">
                      <span className="animate-pulse">{step.tool}</span>
                    </div>
                  )}
                </div>
                {/* Timer + Cost */}
                {(isDone || isActive) && (
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    <StepTimer
                      startedAt={isActive ? stepStartTimes[i] : null}
                      finalMs={isDone ? stepFinalMs[i] : null}
                    />
                    <span className={`mono text-[10px] tabular-nums ${
                      isDone ? 'text-muted-foreground/40' : 'text-amber-400/70 animate-pulse'
                    }`}>
                      {formatStepCost(STEP_COSTS[i])}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Compact plan bar shown above the textarea while task is running ──────────
function TaskPlanBar({ progress }: { progress: number }) {
  const total = AGENT_STEPS_SEQUENCE.length;
  const doneCount = Math.floor(progress * total);
  const activeIdx = doneCount < total ? doneCount : -1;
  const isComplete = doneCount >= total;
  const [collapsed, setCollapsed] = useState(true); // collapsed by default

  // Total elapsed timer
  const totalStartRef = useRef<number | null>(null);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [totalFinal, setTotalFinal] = useState<number | null>(null);
  const prevActiveIdx = useRef(-1);
  const [stepStartTimes, setStepStartTimes] = useState<(number | null)[]>(() => Array(total).fill(null));
  const [stepFinalMs, setStepFinalMs] = useState<(number | null)[]>(() => Array(total).fill(null));

  useEffect(() => {
    if (activeIdx === prevActiveIdx.current) return;
    const prev = prevActiveIdx.current;
    if (prev === -1 && activeIdx === 0) totalStartRef.current = Date.now();
    if (prev >= 0 && prev < total) {
      setStepFinalMs(arr => { const n = [...arr]; n[prev] = STEP_DURATIONS[prev] ?? 1000; return n; });
    }
    if (activeIdx >= 0) {
      setStepStartTimes(arr => { const n = [...arr]; n[activeIdx] = Date.now(); return n; });
    }
    prevActiveIdx.current = activeIdx;
  }, [activeIdx, total]);

  useEffect(() => {
    if (isComplete && totalStartRef.current !== null && totalFinal === null)
      setTotalFinal(STEP_DURATIONS.reduce((a, b) => a + b, 0));
  }, [isComplete, totalFinal]);

  useEffect(() => {
    if (totalFinal !== null || totalStartRef.current === null) return;
    const id = setInterval(() => { if (totalStartRef.current) setTotalElapsed(Date.now() - totalStartRef.current); }, 100);
    return () => clearInterval(id);
  }, [totalFinal]);

  const totalMs = totalFinal ?? totalElapsed;
  const totalSecs = totalMs > 0 ? (totalMs / 1000).toFixed(1) + 's' : '0.0s';
  const activeStep = activeIdx >= 0 ? AGENT_STEPS_SEQUENCE[activeIdx] : null;
  const stepNum = Math.min(doneCount + (activeIdx >= 0 ? 1 : 0), total);

  return (
    <div className="overflow-hidden">
      {/* Single-line header — always visible */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/30 transition-colors text-left">
        {/* Clock icon */}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`flex-shrink-0 ${isComplete ? 'text-emerald-400' : 'text-blue-400'}`}>
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {/* Current step text */}
        <span className={`flex-1 text-[11px] truncate ${
          isComplete ? 'text-emerald-400' : 'text-foreground/80'
        }`}>
          {isComplete
            ? 'Задача выполнена'
            : activeStep
              ? activeStep.action
              : 'Подготовка...'}
        </span>
        {/* Step counter */}
        <span className={`mono text-[10px] tabular-nums flex-shrink-0 ${
          isComplete ? 'text-emerald-400/70' : 'text-muted-foreground/60'
        }`}>
          {stepNum} / {total}
        </span>
        {/* Live timer */}
        <span className={`mono text-[11px] tabular-nums flex-shrink-0 font-medium ${
          isComplete ? 'text-emerald-400' : 'text-blue-400 animate-pulse'
        }`}>
          {totalSecs}
        </span>
        {/* Chevron */}
        <ChevronDown size={11} className={`flex-shrink-0 text-muted-foreground/50 transition-transform ${
          collapsed ? '-rotate-90' : ''
        }`} />
      </button>

      {/* Thin progress bar */}
      <div className="h-0.5 bg-border/30 mx-3">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            isComplete ? 'bg-emerald-400' : 'bg-blue-400'
          }`}
          style={{ width: `${(stepNum / total) * 100}%` }}
        />
      </div>

      {/* Expandable steps list */}
      {!collapsed && (
        <div className="px-3 pb-2 pt-1 space-y-0 border-t border-border/20 mt-1">
          {AGENT_STEPS_SEQUENCE.map((step, i) => {
            const isDone = i < doneCount;
            const isActive = i === activeIdx;
            return (
              <div key={i} className={`flex items-center gap-2 py-1 ${
                i < AGENT_STEPS_SEQUENCE.length - 1 ? 'border-b border-border/10' : ''
              }`}>
                {isDone ? (
                  <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Check size={8} className="text-emerald-400" />
                  </span>
                ) : isActive ? (
                  <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  </span>
                ) : (
                  <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full border border-border/40 flex items-center justify-center">
                    <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                  </span>
                )}
                <span className={`flex-1 text-[11px] truncate ${
                  isDone ? 'text-foreground/40 line-through decoration-muted-foreground/20' :
                  isActive ? 'text-foreground font-medium' :
                  'text-muted-foreground/40'
                }`}>
                  {step.action.replace('...', '')}
                </span>
                {(isDone || isActive) && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <StepTimer
                      startedAt={isActive ? stepStartTimes[i] : null}
                      finalMs={isDone ? stepFinalMs[i] : null}
                    />
                    <span className={`mono text-[10px] ${
                      isDone ? 'text-muted-foreground/30' : 'text-amber-400/60 animate-pulse'
                    }`}>
                      {formatStepCost(STEP_COSTS[i])}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function simulateResponse(taskName: string, modelId: string): string {
  const model = MODELS.find(m => m.id === modelId);
  return `## Ответ от ${model?.name || modelId}

Анализирую задачу: **${taskName}**

Вот детальный план выполнения:

**1. Подготовка окружения**
\`\`\`bash
# Обновление системы
apt update && apt upgrade -y
\`\`\`

**2. Установка зависимостей**
Необходимые пакеты для работы системы:
- \`nginx\` — веб-сервер
- \`php8.1-fpm\` — PHP процессор  
- \`mysql-server\` — база данных

**3. Конфигурация**
Создаём конфигурационный файл:
\`\`\`nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/html;
    index index.php;
}
\`\`\`

✅ **Задача выполнена успешно.** Все компоненты настроены и запущены.

> Стоимость выполнения рассчитана на основе ${Math.floor(Math.random() * 2000 + 500)} входящих и ${Math.floor(Math.random() * 3000 + 1000)} исходящих токенов.`;
}

const COLLECTIVE_MODELS = ["claude-sonnet-4.6", "gpt-5.4", "deepseek-v3.2"];
const COLLECTIVE_SYNTH = "claude-opus-4.6";

// ── Agent role definitions ──────────────────────────────────────────────────
export type AgentRole = { id: string; label: string; icon: string; color: string; modelId: string };

const ALL_AGENTS: AgentRole[] = [
  { id: "orchestrator", label: "Оркестратор",  icon: "🎯", color: "text-violet-400",  modelId: "claude-opus-4.6" },
  { id: "planner",      label: "Планировщик",  icon: "📋", color: "text-blue-400",   modelId: "claude-sonnet-4.6" },
  { id: "coder",        label: "Кодер",         icon: "💻", color: "text-emerald-400",modelId: "deepseek-v3.2" },
  { id: "reviewer",     label: "Ревьюер",       icon: "🔍", color: "text-amber-400",  modelId: "gpt-5.4" },
  { id: "researcher",   label: "Исследователь", icon: "🔬", color: "text-cyan-400",   modelId: "gemini-3.1-pro" },
  { id: "writer",       label: "Писатель",       icon: "✍️", color: "text-pink-400",   modelId: "claude-sonnet-4.6" },
  { id: "analyst",      label: "Аналитик",       icon: "📊", color: "text-orange-400", modelId: "gpt-5.4" },
  { id: "tester",       label: "Тестировщик",   icon: "🧪", color: "text-red-400",    modelId: "gemini-2.5-flash" },
];

// Preset agents per mode (read-only for standard modes)
const MODE_AGENTS: Record<string, string[]> = {
  auto:       [], // auto-assigned on send
  top:        ["orchestrator", "planner", "coder", "reviewer", "researcher"],
  optimum:    ["planner", "coder", "reviewer"],
  lite:       ["coder", "reviewer"],
  free:       ["coder"],
  manual:     ["planner", "coder"], // editable
  normal:     ["coder"],
  collective: [], // model-based, handled separately
};

// Auto-assign agents based on task text keywords
function autoAssignAgents(text: string): string[] {
  const t = text.toLowerCase();
  const agents: string[] = [];
  if (t.match(/план|архитект|структур|design/)) agents.push("planner");
  if (t.match(/код|разраб|implement|build|create|написа/)) agents.push("coder");
  if (t.match(/провер|ревью|review|audit|тест/)) agents.push("reviewer");
  if (t.match(/исслед|найди|search|анализ|research/)) agents.push("researcher");
  if (t.match(/напиши|текст|статья|write|content/)) agents.push("writer");
  if (t.match(/аналит|данные|data|отчёт|report/)) agents.push("analyst");
  if (t.match(/тест|test|qa|баг|bug/)) agents.push("tester");
  if (agents.length === 0) agents.push("coder");
  if (agents.length > 1) agents.unshift("orchestrator");
  return agents;
}

function CollectiveBlock({ query, synthModelId }: { query: string; synthModelId?: string }) {
  const [expanded, setExpanded] = useState(false);
  const opinions = COLLECTIVE_MODELS.map(mid => {
    const m = MODELS.find(x => x.id === mid)!;
    return { model: m, text: `Краткое мнение от ${m.name}: рекомендую подход через ${mid.includes("claude") ? "функциональную декомпозицию" : mid.includes("gpt") ? "объектно-ориентированную архитектуру" : "минималистичный алгоритм"}.` };
  });
  const synth = MODELS.find(m => m.id === (synthModelId || COLLECTIVE_SYNTH)) || MODELS.find(m => m.id === COLLECTIVE_SYNTH)!;
  return (
    <div className="collective-block my-3">
      <div className="flex items-center gap-2 mb-3">
        <Brain size={13} className="text-primary" />
        <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Коллективный разум</span>
      </div>
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between text-left mb-2 hover:opacity-80 transition-opacity">
        <span className="text-[11px] text-muted-foreground">{COLLECTIVE_MODELS.length} моделей опрошено</span>
        <ChevronDown size={12} className={`text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="space-y-2 mb-3">
          {opinions.map(({ model, text }) => (
            <div key={model.id} className="bg-background/50 border border-border/50 rounded p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px]" style={{ color: model.color }}>{model.icon}</span>
                <span className="text-[10px] font-medium text-muted-foreground">{model.name}</span>
                <span className="mono text-[9px] text-muted-foreground/50">{formatCost(Math.random() * 0.05 + 0.01)}</span>
              </div>
              <div className="text-[11px] text-foreground/70">{text}</div>
            </div>
          ))}
        </div>
      )}
      <div className="border-t border-border/50 pt-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px]" style={{ color: synth.color }}>{synth.icon}</span>
          <span className="text-[10px] font-semibold text-foreground">{synth.name}</span>
          <span className="text-[10px] text-muted-foreground">— синтез</span>
        </div>
        <div className="text-[12px] text-foreground">
          На основе анализа {COLLECTIVE_MODELS.length} моделей: оптимальным является комбинированный подход, сочетающий функциональную декомпозицию с чёткой архитектурой модулей.
        </div>
        <div className="mt-1.5 mono text-[10px] text-muted-foreground">
          Общая стоимость: {formatCost(0.089)} · {COLLECTIVE_MODELS.length + 1} запроса
        </div>
      </div>
    </div>
  );
}

function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="thinking-block mb-2">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full text-left">
        <ChevronRight size={11} className={`transition-transform ${open ? "rotate-90" : ""}`} />
        <span>Размышление модели</span>
      </button>
      {open && <div className="mt-2 text-[11px] leading-relaxed text-muted-foreground font-mono">{text}</div>}
    </div>
  );
}

function MessageRow({
  msg,
  onEdit,
}: {
  msg: Message;
  onEdit?: (id: string, newContent: string) => void;
}) {
  const model = MODELS.find(m => m.id === msg.model);
  const isUser = msg.role === "user";
  const [reaction, setReaction] = useState<"up" | "down" | null>(null);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);

  const commitEdit = () => {
    if (editText.trim() && onEdit) {
      onEdit(msg.id, editText.trim());
      toast.success("Сообщение обновлено");
    }
    setEditing(false);
  };

  return (
    <div className={`py-3 border-b border-border/40 group ${isUser ? "msg-user" : "msg-ai"}`}>
      <div className="flex items-center gap-2 mb-2">
        {isUser ? (
          <>
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">А</div>
            <span className="text-[11px] font-medium text-foreground">Вы</span>
          </>
        ) : (
          <>
            <span className="text-[13px]" style={{ color: model?.color }}>{model?.icon || "◇"}</span>
            <span className="text-[11px] font-medium text-foreground">{model?.name || msg.model}</span>
          </>
        )}
        <span className="text-[10px] text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity">{msg.timestamp}</span>
        {msg.cost && (
          <span className="mono text-[10px] text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity">{formatCost(msg.cost)}</span>
        )}
        {!isUser && msg.latency != null && (
          <span className="mono text-[10px] text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity bg-accent/60 px-1.5 py-0.5 rounded">
            {msg.latency}s
          </span>
        )}
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {isUser ? (
            <button onClick={() => { setEditing(true); setEditText(msg.content); }}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Редактировать">
              <Pencil size={11} />
            </button>
          ) : (
            <>
              <button onClick={() => { navigator.clipboard.writeText(msg.content); toast.success("Скопировано"); }}
                className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                <Copy size={11} />
              </button>
              <button onClick={() => setReaction(reaction === "up" ? null : "up")}
                className={`p-1 rounded hover:bg-accent transition-colors ${reaction === "up" ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"}`}>
                <ThumbsUp size={11} />
              </button>
              <button onClick={() => setReaction(reaction === "down" ? null : "down")}
                className={`p-1 rounded hover:bg-accent transition-colors ${reaction === "down" ? "text-red-400" : "text-muted-foreground hover:text-foreground"}`}>
                <ThumbsDown size={11} />
              </button>
              <button className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Повторить">
                <RotateCcw size={11} />
              </button>
            </>
          )}
        </div>
      </div>

      {msg.thinking && <ThinkingBlock text={msg.thinking} />}

      {editing ? (
        <div className="space-y-2">
          <textarea
            className="w-full bg-input border border-primary/50 rounded-lg px-3 py-2 text-[13px] text-foreground resize-none outline-none focus:border-primary transition-colors leading-relaxed"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={3}
            autoFocus
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); }
              if (e.key === "Escape") { setEditing(false); setEditText(msg.content); }
            }}
          />
          <div className="flex items-center gap-2">
            <button onClick={commitEdit} className="flex items-center gap-1 px-2.5 py-1 bg-primary text-primary-foreground rounded text-[11px] hover:bg-primary/80 transition-colors">
              <Check size={10} /> Сохранить
            </button>
            <button onClick={() => { setEditing(false); setEditText(msg.content); }}
              className="flex items-center gap-1 px-2.5 py-1 bg-muted text-muted-foreground rounded text-[11px] hover:bg-accent transition-colors">
              <X size={10} /> Отмена
            </button>
          </div>
        </div>
      ) : (
        <div className={`text-[13px] leading-relaxed ${isUser ? "text-foreground/90" : "text-foreground"}`}>
          <Streamdown>{msg.content}</Streamdown>
        </div>
      )}

      {msg.tokens && !editing && (
        <div className="mt-2 flex items-center gap-3">
          <span className="mono text-[10px] text-muted-foreground/40">↑{msg.tokens.in} ↓{msg.tokens.out} токенов</span>
        </div>
      )}
    </div>
  );
}

// ── Uploaded file chip type ────────────────────────────────────────────────────────────────
interface UploadedFile { id: string; name: string; size: number; type: string; preview?: string; }

// ── InputCard ──────────────────────────────────────────────────────────────────────────
function InputCard({
  input, setInput, isGenerating, handleSend, handleStop,
  capabilities, setCapabilities, chatMode, setChatMode,
  showModePicker, setShowModePicker, showModelPicker, setShowModelPicker,
  selectedModel, setSelectedModel, textareaRef, liveCost,
  agentIds, setAgentIds, collectiveModelIds, setCollectiveModelIds,
  collectiveSynthModel, setCollectiveSynthModel,
  onAgentModelOverridesChange,
}: {
  input: string;
  setInput: (v: string) => void;
  isGenerating: boolean;
  handleSend: (override?: string) => void;
  handleStop: () => void;
  capabilities: Record<string, boolean>;
  setCapabilities: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  chatMode: string;
  setChatMode: (v: string) => void;
  showModePicker: boolean;
  setShowModePicker: React.Dispatch<React.SetStateAction<boolean>>;
  showModelPicker: boolean;
  setShowModelPicker: React.Dispatch<React.SetStateAction<boolean>>;
  selectedModel: string;
  setSelectedModel: (v: string) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  liveCost: number;
  agentIds: string[];
  setAgentIds: React.Dispatch<React.SetStateAction<string[]>>;
  collectiveModelIds: string[];
  setCollectiveModelIds: React.Dispatch<React.SetStateAction<string[]>>;
  collectiveSynthModel: string;
  setCollectiveSynthModel: (v: string) => void;
  onAgentModelOverridesChange?: (overrides: Record<string, string>) => void;
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [pasteHighlight, setPasteHighlight] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported] = useState(() => typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window));
  const [showAgentPicker, setShowAgentPicker] = useState(false);
  const [showCollectivePicker, setShowCollectivePicker] = useState(false);
  const [showSynthPicker, setShowSynthPicker] = useState(false);
  // Per-agent model overrides (MANUAL mode only)
  const [agentModelOverrides, setAgentModelOverrides] = useState<Record<string, string>>({});
  const [showModelPickerFor, setShowModelPickerFor] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const currentMode = CHAT_MODES.find(m => m.id === chatMode) || CHAT_MODES[0];
  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  const addFiles = useCallback((incoming: FileList | File[], fromPaste = false) => {
    const arr = Array.from(incoming);
    const chips: UploadedFile[] = arr.map(f => ({
      id: Math.random().toString(36).slice(2),
      name: f.name || `screenshot_${Date.now()}.png`,
      size: f.size, type: f.type,
      preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined,
    }));
    setFiles(prev => [...prev, ...chips]);
    if (fromPaste) {
      toast.success(`📷 Изображение вставлено из буфера обмена`);
    } else {
      toast.success(`Загружено ${arr.length} файл${arr.length > 1 ? "а" : ""}`);
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItems = items.filter(item => item.type.startsWith("image/"));
    if (imageItems.length === 0) return; // let normal text paste proceed
    e.preventDefault();
    const imageFiles = imageItems
      .map(item => item.getAsFile())
      .filter((f): f is File => f !== null);
    if (imageFiles.length > 0) {
      addFiles(imageFiles, true);
      setPasteHighlight(true);
      setTimeout(() => setPasteHighlight(false), 600);
    }
  }, [addFiles]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const toggleVoice = () => {
    if (!voiceSupported) { toast.error("Голосовой ввод не поддерживается в этом браузере"); return; }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "ru-RU";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onstart = () => setIsListening(true);
    rec.onend = () => setIsListening(false);
    rec.onerror = () => { setIsListening(false); toast.error("Ошибка голосового ввода"); };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(e.results as any[])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((r: any) => r[0].transcript).join("");
      setInput(transcript);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
      }
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightboxSrc) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setLightboxSrc(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxSrc]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div
      className={`flex-shrink-0 px-3 pb-3 pt-2 transition-colors ${
        isDragging ? "bg-primary/5" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-over overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/60 bg-primary/5 pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <Paperclip size={28} className="text-primary" />
            <span className="text-sm font-medium text-primary">Перетащите файлы сюда</span>
          </div>
        </div>
      )}

      {/* Unified card */}
      <div className={`relative rounded-xl border transition-all duration-150 ${
        isDragging
          ? "border-primary/60 bg-accent/30"
          : pasteHighlight
          ? "border-emerald-400/70 bg-emerald-400/5"
          : "border-border bg-input/60 hover:border-border/80 focus-within:border-primary/40"
      }`}>

        {/* Uploaded file chips — horizontal scroll row */}
        {files.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 pt-2.5 pb-0 overflow-x-auto scrollbar-none" style={{ scrollbarWidth: "none" }}>
            {files.map(f => {
              // Determine icon for non-image files
              const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
              const isImg = !!f.preview;
              const isPdf = ext === "pdf";
              const isCode = ["js","ts","tsx","jsx","py","sh","json","yaml","yml","html","css","sql","md","txt","env","toml","xml"].includes(ext);
              const isArchive = ["zip","tar","gz","rar","7z"].includes(ext);
              return (
                <div key={f.id} className="relative flex items-center gap-1.5 px-2 py-1 rounded-lg bg-accent/80 border border-border/70 text-[11px] text-foreground flex-shrink-0 group/chip"
                  style={{ maxWidth: 200 }}>
                  {/* Thumbnail or icon */}
                  {isImg ? (
                    <img src={f.preview} alt={f.name}
                      onClick={() => setLightboxSrc(f.preview!)}
                      className="w-8 h-8 rounded-md object-cover flex-shrink-0 border border-border/50 cursor-zoom-in hover:opacity-80 transition-opacity" />
                  ) : isPdf ? (
                    <span className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-md bg-red-500/15 border border-red-500/20 text-red-400 text-[10px] font-bold">PDF</span>
                  ) : isCode ? (
                    <span className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-md bg-blue-500/15 border border-blue-500/20">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                    </span>
                  ) : isArchive ? (
                    <span className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-md bg-amber-500/15 border border-amber-500/20">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                    </span>
                  ) : (
                    <span className="w-8 h-8 flex items-center justify-center flex-shrink-0 rounded-md bg-accent border border-border">
                      <Paperclip size={12} className="text-muted-foreground" />
                    </span>
                  )}
                  {/* Name + size */}
                  <div className="flex flex-col min-w-0">
                    <span className="truncate leading-tight text-[11px]">{f.name}</span>
                    <span className="text-muted-foreground/60 text-[10px]">{formatFileSize(f.size)}</span>
                  </div>
                  {/* × remove button — visible on hover */}
                  <button
                    onClick={() => { if (f.preview) URL.revokeObjectURL(f.preview); setFiles(prev => prev.filter(x => x.id !== f.id)); }}
                    title="Удалить"
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-zinc-700 border border-border flex items-center justify-center text-muted-foreground hover:text-white hover:bg-destructive hover:border-destructive transition-all opacity-0 group-hover/chip:opacity-100 z-10">
                    <X size={8} />
                  </button>
                </div>
              );
            })}
            {/* Clear-all button shown when 3+ files */}
            {files.length >= 3 && (
              <button
                onClick={() => { files.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); }); setFiles([]); }}
                className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 border border-dashed border-border/60 transition-colors whitespace-nowrap"
                title="Удалить все файлы">
                <X size={9} />
                <span>Очистить всё</span>
              </button>
            )}
          </div>
        )}

        {/* Image lightbox portal */}
        {lightboxSrc && createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)", animation: "fadeIn 0.12s ease" }}
            onClick={() => setLightboxSrc(null)}>
            <div
              className="relative rounded-xl overflow-hidden shadow-2xl"
              style={{ maxWidth: "90vw", maxHeight: "90vh", animation: "scaleIn 0.15s ease" }}
              onClick={e => e.stopPropagation()}>
              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 z-10"
                style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
                <span className="text-white/70 text-[11px] font-mono truncate max-w-[60%]">
                  {files.find(f => f.preview === lightboxSrc)?.name ?? "image"}
                </span>
                <div className="flex items-center gap-2">
                  <a href={lightboxSrc}
                    download={files.find(f => f.preview === lightboxSrc)?.name ?? "image.png"}
                    onClick={e => e.stopPropagation()}
                    className="text-white/70 hover:text-white transition-colors p-1 rounded"
                    title="Скачать">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </a>
                  <button onClick={() => setLightboxSrc(null)}
                    className="text-white/70 hover:text-white transition-colors p-1 rounded"
                    title="Закрыть (Esc)">
                    <X size={14} />
                  </button>
                </div>
              </div>
              <img src={lightboxSrc} alt="Preview"
                className="block object-contain"
                style={{ maxWidth: "90vw", maxHeight: "85vh" }} />
            </div>
          </div>,
          document.body
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={
            isListening
              ? "Слушаю..."
              : chatMode === "collective"
              ? "Задайте вопрос — все модели ответят одновременно..."
              : "Send a message to Arcane..."
          }
          rows={1}
          className="w-full bg-transparent px-3.5 pt-3 pb-1 text-[13px] text-foreground placeholder:text-muted-foreground/50 resize-none outline-none leading-relaxed"
          style={{ minHeight: "44px", maxHeight: "200px", overflowY: "auto" }}
          onInput={e => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 200) + "px";
          }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center gap-1 px-2 pb-2 pt-1">

          {/* + file upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Загрузить файл"
            className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
            <Plus size={15} />
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden"
            onChange={e => { if (e.target.files?.length) { addFiles(e.target.files); e.target.value = ""; } }} />

          {/* Capability pills */}
          <div className="flex items-center gap-1 flex-1 overflow-x-auto scrollbar-none">
            {CAPABILITIES.map(cap => (
              <button
                key={cap.id}
                onClick={() => setCapabilities(prev => ({ ...prev, [cap.id]: !prev[cap.id] }))}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border whitespace-nowrap transition-all duration-150 ${
                  capabilities[cap.id]
                    ? `${cap.color} bg-accent/60 border-border`
                    : "text-muted-foreground/40 border-transparent hover:border-border hover:text-muted-foreground"
                }`}>
                {cap.icon}
                <span>{cap.label}</span>
              </button>
            ))}
          </div>

          {/* Right side: voice + send/stop */}
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-1">
            {/* Voice mic */}
            <button
              onClick={toggleVoice}
              title={isListening ? "Остановить запись" : "Голосовой ввод"}
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 ${
                isListening
                  ? "text-red-400 bg-red-400/15 animate-pulse"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}>
              {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            </button>

            {/* Send / Stop */}
            {isGenerating ? (
              <button onClick={handleStop}
                className="w-7 h-7 rounded-md bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 flex items-center justify-center transition-colors">
                <Square size={12} className="text-red-400 fill-red-400" />
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() && files.length === 0}
                className="w-7 h-7 rounded-md bg-primary hover:bg-primary/80 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
                <Send size={12} className="text-primary-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Mode + Model row — very bottom inside card */}
        <div className="flex items-center gap-1.5 px-3 pb-2 border-t border-border/30 pt-1.5">
          {/* Mode picker */}
          <div className="relative">
            <button onClick={() => { setShowModePicker(v => !v); setShowModelPicker(false); }}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              <span>{currentMode.icon}</span>
              <span>{currentMode.label}</span>
              <ChevronDown size={9} className="opacity-50" />
            </button>
            {showModePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowModePicker(false)} />
                <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
                  {CHAT_MODES.map(mode => (
                    <button key={mode.id} onClick={() => { setChatMode(mode.id); setShowModePicker(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-accent transition-colors ${
                        chatMode === mode.id ? "text-primary" : "text-foreground"
                      }`}>
                      <span>{mode.icon}</span><span>{mode.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <span className="text-border/50 text-[10px]">·</span>

          {/* Model picker */}
          {chatMode !== "collective" && (
            <div className="relative">
              <button onClick={() => { setShowModelPicker(v => !v); setShowModePicker(false); }}
                className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                <span style={{ color: currentModel.color }}>{currentModel.icon}</span>
                <span>{currentModel.name}</span>
                <span className="mono text-[9px] opacity-50">${currentModel.costOut}/M</span>
                <ChevronDown size={9} className="opacity-50" />
              </button>
              {showModelPicker && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowModelPicker(false)} />
                  <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 min-w-[260px] max-h-64 overflow-y-auto">
                    {["fast", "standard", "genius", "optimum"].map(tier => {
                      const tierModels = MODELS.filter(m => m.tier === tier);
                      if (!tierModels.length) return null;
                      return (
                        <div key={tier}>
                          <div className="px-3 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                            {TIER_LABELS[tier]}
                          </div>
                          {tierModels.map(m => (
                            <button key={m.id} onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                              className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent transition-colors ${
                                selectedModel === m.id ? "bg-accent/50" : ""
                              }`}>
                              <span className="text-[12px]" style={{ color: m.color }}>{m.icon}</span>
                              <div className="flex-1 text-left">
                                <div className="text-[11px] text-foreground">{m.name}</div>
                              </div>
                              <div className="mono text-[9px] text-muted-foreground">${m.costIn}/${m.costOut}</div>
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Agent chips (non-collective modes) ── */}
          {chatMode !== "collective" && (
            <>
              <span className="text-border/30 text-[10px]">|</span>
              <div className="flex items-center gap-1 flex-wrap">
                {chatMode === "auto" && agentIds.length === 0 && (
                  <span className="text-[10px] text-muted-foreground/50 italic">авто-назначение при отправке</span>
                )}
                {agentIds.map(aid => {
                  const agent = ALL_AGENTS.find(a => a.id === aid);
                  if (!agent) return null;
                  const effectiveModelId = agentModelOverrides[aid] || agent.modelId;
                  const model = MODELS.find(m => m.id === effectiveModelId);
                  const isManual = chatMode === "manual";
                  return (
                    <div key={aid} className="relative group">
                      {/* Agent chip */}
                      <div className={`flex flex-col px-1.5 py-0.5 rounded text-[10px] ${
                        isManual
                          ? "bg-accent/60 border border-border/50"
                          : "bg-accent/30"
                      } ${agent.color}`}>
                        {/* Top row: icon + name + remove */}
                        <div className="flex items-center gap-1">
                          <span>{agent.icon}</span>
                          <span className="font-medium">{agent.label}</span>
                          {isManual && (
                            <button
                              onClick={() => setAgentIds(prev => prev.filter(id => id !== aid))}
                              className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all text-muted-foreground">
                              <X size={8} />
                            </button>
                          )}
                        </div>
                        {/* Bottom row: model name */}
                        {model && (
                          isManual ? (
                            <button
                              onClick={() => setShowModelPickerFor(v => v === aid ? null : aid)}
                              className="text-left text-[9px] text-muted-foreground/70 hover:text-foreground transition-colors truncate max-w-[80px] mt-0.5">
                              ◇ {model.name}
                            </button>
                          ) : (
                            <span className="text-[9px] text-muted-foreground/60 truncate max-w-[80px] mt-0.5">◇ {model.name}</span>
                          )
                        )}
                      </div>
                      {/* Model picker dropdown (MANUAL only) */}
                      {isManual && showModelPickerFor === aid && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowModelPickerFor(null)} />
                          <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 min-w-[200px] max-h-[260px] overflow-y-auto">
                            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider border-b border-border/50 mb-1">
                              Модель для {agent.label}
                            </div>
                            {MODELS.map(m => (
                              <button key={m.id}
                                onClick={() => {
                                  const newOverrides = { ...agentModelOverrides, [aid]: m.id };
                                  setAgentModelOverrides(newOverrides);
                                  onAgentModelOverridesChange?.(newOverrides);
                                  setShowModelPickerFor(null);
                                }}
                                className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent transition-colors ${
                                  effectiveModelId === m.id ? "bg-primary/10 text-primary" : ""
                                }`}>
                                <div className="flex-1 text-left">
                                  <div className="text-[11px] text-foreground">{m.name}</div>
                                  <div className="text-[9px] text-muted-foreground">${('costIn' in m ? m.costIn : 0).toFixed(2)}/${('costOut' in m ? m.costOut : 0).toFixed(2)} за 1M</div>
                                </div>
                                {effectiveModelId === m.id && <Check size={10} className="text-primary flex-shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                {/* MANUAL: add agent button */}
                {chatMode === "manual" && (
                  <div className="relative">
                    <button
                      onClick={() => setShowAgentPicker(v => !v)}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-muted-foreground/50 hover:text-foreground hover:bg-accent/50 border border-dashed border-border/40 transition-colors">
                      <Plus size={9} />
                      <span>агент</span>
                    </button>
                    {showAgentPicker && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowAgentPicker(false)} />
                        <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 min-w-[200px]">
                          {ALL_AGENTS.filter(a => !agentIds.includes(a.id)).map(agent => {
                            const model = MODELS.find(m => m.id === agent.modelId);
                            return (
                              <button key={agent.id}
                                onClick={() => { setAgentIds(prev => [...prev, agent.id]); setShowAgentPicker(false); }}
                                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent transition-colors">
                                <span className={`text-[12px] ${agent.color}`}>{agent.icon}</span>
                                <div className="flex-1 text-left">
                                  <div className="text-[11px] text-foreground">{agent.label}</div>
                                  {model && <div className="text-[9px] text-muted-foreground">{model.name}</div>}
                                </div>
                              </button>
                            );
                          })}
                          {ALL_AGENTS.filter(a => !agentIds.includes(a.id)).length === 0 && (
                            <div className="px-3 py-2 text-[11px] text-muted-foreground">Все агенты добавлены</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Collective: model chips ── */}
          {chatMode === "collective" && (
            <>
              <span className="text-border/30 text-[10px]">|</span>
              <div className="flex items-center gap-1 flex-wrap">
                {collectiveModelIds.map(mid => {
                  const m = MODELS.find(x => x.id === mid);
                  if (!m) return null;
                  return (
                    <div key={mid} className="relative group">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/10 border border-primary/20 cursor-default"
                        title={m.name}>
                        <span style={{ color: m.color }}>{m.icon}</span>
                        <span className="text-foreground/70">{m.name.split(" ").slice(-1)[0]}</span>
                        <button
                          onClick={() => setCollectiveModelIds(prev => prev.filter(id => id !== mid))}
                          className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all text-muted-foreground">
                          <X size={8} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {/* Add model to collective */}
                {collectiveModelIds.length < 5 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowCollectivePicker(v => !v)}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-primary/50 hover:text-primary hover:bg-primary/10 border border-dashed border-primary/30 transition-colors">
                      <Plus size={9} />
                      <span>модель</span>
                    </button>
                    {showCollectivePicker && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowCollectivePicker(false)} />
                        <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 min-w-[220px] max-h-48 overflow-y-auto">
                          {MODELS.filter(m => !collectiveModelIds.includes(m.id)).map(m => (
                            <button key={m.id}
                              onClick={() => { setCollectiveModelIds(prev => [...prev, m.id]); setShowCollectivePicker(false); }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent transition-colors">
                              <span className="text-[12px]" style={{ color: m.color }}>{m.icon}</span>
                              <div className="flex-1 text-left">
                                <div className="text-[11px] text-foreground">{m.name}</div>
                                <div className="text-[9px] text-muted-foreground">{m.provider}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {/* Synth model picker */}
                <div className="relative">
                  {collectiveSynthModel ? (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 group">
                      <span className="text-[10px]" style={{ color: MODELS.find(m => m.id === collectiveSynthModel)?.color }}>{MODELS.find(m => m.id === collectiveSynthModel)?.icon}</span>
                      <span className="text-[10px] text-amber-400 font-medium">{MODELS.find(m => m.id === collectiveSynthModel)?.name}</span>
                      <span className="text-[9px] text-amber-400/60">синтез</span>
                      <button
                        onClick={() => setShowSynthPicker(v => !v)}
                        className="ml-0.5 text-[9px] text-amber-400/50 hover:text-amber-400 transition-colors">
                        ✎
                      </button>
                      <button
                        onClick={() => setCollectiveSynthModel("")}
                        className="opacity-0 group-hover:opacity-100 ml-0.5 hover:text-red-400 transition-all text-muted-foreground">
                        <X size={8} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSynthPicker(v => !v)}
                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] text-amber-400/50 hover:text-amber-400 hover:bg-amber-500/10 border border-dashed border-amber-500/30 transition-colors">
                      <Plus size={9} />
                      <span>синтез</span>
                    </button>
                  )}
                  {showSynthPicker && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowSynthPicker(false)} />
                      <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 min-w-[220px] max-h-48 overflow-y-auto">
                        <div className="px-3 py-1.5 border-b border-border/50 mb-1">
                          <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Модель-синтезатор</span>
                          <div className="text-[9px] text-muted-foreground mt-0.5">Консолидирует ответы всех агентов</div>
                        </div>
                        {MODELS.map(m => (
                          <button key={m.id}
                            onClick={() => { setCollectiveSynthModel(m.id); setShowSynthPicker(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent transition-colors ${
                              collectiveSynthModel === m.id ? "bg-amber-500/10" : ""
                            }`}>
                            <span className="text-[12px]" style={{ color: m.color }}>{m.icon}</span>
                            <div className="flex-1 text-left">
                              <div className="text-[11px] text-foreground">{m.name}</div>
                              <div className="text-[9px] text-muted-foreground">{m.provider}</div>
                            </div>
                            {collectiveSynthModel === m.id && <span className="text-[9px] text-amber-400">✓</span>}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex-1" />
          {isGenerating && (
            <span className="mono text-[10px] text-blue-400 animate-pulse">Генерация... {formatCost(liveCost)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel() {
  const { state, dispatch } = useApp();
  const [input, setInput] = useState("");
  const [selectedModel, setSelectedModel] = useState("claude-sonnet-4.6");
  const [chatMode, setChatMode] = useState("normal");
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [showModePicker, setShowModePicker] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [liveCost, setLiveCost] = useState(0);
  const [capabilities, setCapabilities] = useState<Record<string, boolean>>({
    search: true, browser: true, ssh: false, files: false, images: false,
  });
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [agentIds, setAgentIds] = useState<string[]>(() => MODE_AGENTS["normal"] || ["coder"]);
  const [collectiveModelIds, setCollectiveModelIds] = useState<string[]>(COLLECTIVE_MODELS);
  const [collectiveSynthModel, setCollectiveSynthModel] = useState<string>(COLLECTIVE_SYNTH);
  const [agentModelOverrides, setAgentModelOverrides] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reset agents when mode changes (except manual/collective which keep user selection)
  useEffect(() => {
    if (chatMode !== "manual" && chatMode !== "collective" && chatMode !== "auto") {
      setAgentIds(MODE_AGENTS[chatMode] || ["coder"]);
    }
    if (chatMode === "auto") {
      setAgentIds([]); // will be auto-assigned on send
    }
  }, [chatMode]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stopRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTask = state.activeProjectId && state.activeTaskId
    ? state.projects.find(p => p.id === state.activeProjectId)?.tasks.find(t => t.id === state.activeTaskId)
    : null;

  const activeProject = state.projects.find(p => p.id === state.activeProjectId);
  const projectCost = state.activeProjectId ? getProjectCost(state.projects, state.activeProjectId) : 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTask?.messages, streamingText]);

  // Show follow-up after last AI message
  useEffect(() => {
    if (activeTask && activeTask.messages.length > 0) {
      const last = activeTask.messages[activeTask.messages.length - 1];
      setShowFollowUp(last.role === "assistant");
    } else {
      setShowFollowUp(false);
    }
  }, [activeTask?.messages]);

  // Close all popups on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowModelPicker(false);
        setShowModePicker(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleStop = () => {
    stopRef.current = true;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsGenerating(false);
    setStreamingText("");
    setLiveCost(0);
    if (state.activeProjectId && state.activeTaskId) {
      dispatch({ type: "UPDATE_TASK_STATUS", projectId: state.activeProjectId, taskId: state.activeTaskId, status: "warning" });
    }
    toast.warning("Генерация остановлена");
  };

  const handleSend = async (overrideInput?: string) => {
    const text = (overrideInput ?? input).trim();
    if (!text || !state.activeProjectId || !state.activeTaskId || isGenerating) return;
    // AUTO mode: assign agents based on task content
    if (chatMode === "auto") {
      const assigned = autoAssignAgents(text);
      setAgentIds(assigned);
    }
    const userMsg: Message = {
      id: `m${Date.now()}`, role: "user", content: text,
      timestamp: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
    };
    dispatch({ type: "ADD_MESSAGE", projectId: state.activeProjectId, taskId: state.activeTaskId, message: userMsg });
    dispatch({ type: "UPDATE_TASK_STATUS", projectId: state.activeProjectId, taskId: state.activeTaskId, status: "running" });
    // Save agents used for this task (including per-agent model overrides from MANUAL mode)
    dispatch({
      type: "UPDATE_TASK_AGENTS",
      projectId: state.activeProjectId,
      taskId: state.activeTaskId,
      agentIds: chatMode === "auto" ? autoAssignAgents(text) : agentIds,
      chatMode,
      collectiveModelIds: chatMode === "collective" ? collectiveModelIds : undefined,
      agentModelOverrides: chatMode === "manual" && Object.keys(agentModelOverrides).length > 0 ? agentModelOverrides : undefined,
    });
    setInput("");
    setIsGenerating(true);
    setStreamingText("");
    setLiveCost(0);
    stopRef.current = false;
    setShowFollowUp(false);

    const activeSynth = chatMode === "collective" ? (collectiveSynthModel || COLLECTIVE_SYNTH) : selectedModel;
    const fullText = chatMode === "collective"
      ? "[COLLECTIVE]" + simulateResponse(activeTask?.name || "задача", activeSynth)
      : simulateResponse(activeTask?.name || "задача", selectedModel);

    const model = MODELS.find(m => m.id === selectedModel);
    const costPerChar = (model?.costOut || 5) / 1_000_000 / 4;
    const sendStartTime = Date.now();
    let i = 0;
    intervalRef.current = setInterval(() => {
      if (stopRef.current) return;
      if (i >= fullText.length) {
        clearInterval(intervalRef.current!);
        const finalCost = parseFloat((fullText.length * costPerChar).toFixed(4));
        const aiMsg: Message = {
          id: `m${Date.now()}`, role: "assistant",
          model: chatMode === "collective" ? activeSynth : selectedModel,
          content: chatMode === "collective" ? fullText.replace("[COLLECTIVE]", "") : fullText,
          timestamp: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
          tokens: { in: Math.floor(Math.random() * 1000 + 500), out: Math.floor(fullText.length / 4) },
          cost: finalCost,
          latency: parseFloat(((Date.now() - sendStartTime) / 1000).toFixed(1)),
        };
        dispatch({ type: "ADD_MESSAGE", projectId: state.activeProjectId!, taskId: state.activeTaskId!, message: aiMsg });
        dispatch({ type: "UPDATE_TASK_STATUS", projectId: state.activeProjectId!, taskId: state.activeTaskId!, status: "done", duration: `${Math.floor(Math.random() * 5 + 1)}m ${Math.floor(Math.random() * 59)}s` });

        if (activeProject?.budget != null) {
          const newProjectCost = projectCost + finalCost;
          const pct = (newProjectCost / activeProject.budget) * 100;
          const prevPct = (projectCost / activeProject.budget) * 100;
          if (pct >= 100 && prevPct < 100) {
            toast.error(`⚠️ Бюджет проекта «${activeProject.name}» превышен!`, {
              description: `Потрачено $${newProjectCost.toFixed(2)} из $${activeProject.budget.toFixed(2)}`, duration: 8000
            });
          } else if (pct >= 80 && prevPct < 80) {
            toast.warning(`⚠️ Бюджет проекта «${activeProject.name}» использован на 80%`, {
              description: `Остаток: $${(activeProject.budget - newProjectCost).toFixed(2)}`, duration: 6000
            });
          }
        }
        setIsGenerating(false);
        setStreamingText("");
        setLiveCost(0);
        return;
      }
      const chunk = fullText.slice(0, i + 8);
      setStreamingText(chunk);
      setLiveCost(parseFloat((chunk.length * costPerChar).toFixed(4)));
      i += 8;
    }, 30);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleEditMessage = (id: string, newContent: string) => {
    if (!state.activeProjectId || !state.activeTaskId) return;
    dispatch({ type: "EDIT_MESSAGE", projectId: state.activeProjectId, taskId: state.activeTaskId, messageId: id, content: newContent });
  };

  const currentModel = MODELS.find(m => m.id === selectedModel)!;
  const currentMode = CHAT_MODES.find(m => m.id === chatMode)!;

  if (!activeTask) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
          <Zap size={20} className="text-primary" />
        </div>
        <div className="text-[15px] font-medium text-foreground mb-1">Выберите задачу</div>
        <div className="text-[13px] text-muted-foreground max-w-xs">
          Выберите существующую задачу из левой панели или создайте новую в проекте
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-border flex-shrink-0">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium text-foreground truncate">{activeTask.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-muted-foreground">{activeProject?.name}</span>
            <span className="text-muted-foreground/30">·</span>
            <span className={`mono text-[11px] font-medium transition-colors ${isGenerating ? "text-blue-400" : "text-muted-foreground"}`}>
              {isGenerating ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  {formatCost(activeTask.cost + liveCost)}
                </span>
              ) : formatCost(activeTask.cost)}
            </span>
            <span className="text-muted-foreground/30">·</span>
            <span className="mono text-[10px] text-muted-foreground">Проект: {formatCost(projectCost + (isGenerating ? liveCost : 0))}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isGenerating && (
            <button onClick={handleStop}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-[11px] transition-colors">
              <Square size={10} className="fill-red-400" />
              Стоп
            </button>
          )}
          <span className={`w-2 h-2 rounded-full ${
            activeTask.status === "running" ? "bg-blue-400 animate-pulse" :
            activeTask.status === "done" ? "bg-emerald-400" :
            activeTask.status === "error" ? "bg-red-400" :
            activeTask.status === "warning" ? "bg-yellow-400" : "bg-zinc-600"
          }`} />
          <span className="text-[11px] text-muted-foreground capitalize">{activeTask.status}</span>
        </div>
      </div>

      {/* Messages or Empty state */}
      <div className="flex-1 overflow-y-auto px-5 py-2">
        {activeTask.messages.length === 0 && !isGenerating ? (
          <EmptyChat
            projectName={activeProject?.name || ""}
            taskName={activeTask.name}
            onSelectTemplate={(text) => {
              setInput(text);
              textareaRef.current?.focus();
            }}
          />
        ) : (
          <>
            {activeTask.messages.map(msg => (
              msg.content.startsWith("[COLLECTIVE]") ? null :
              <MessageRow key={msg.id} msg={msg} onEdit={handleEditMessage} />
            ))}

            {/* Streaming message */}
            {isGenerating && streamingText && (
              <div className="py-3 border-b border-border/40">
                <div className="flex items-center gap-2 mb-2">
                  {chatMode === "collective" ? (
                    <>
                      <Brain size={13} className="text-primary" />
                      <span className="text-[11px] font-medium text-foreground">Коллективный разум</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[13px]" style={{ color: currentModel.color }}>{currentModel.icon}</span>
                      <span className="text-[11px] font-medium text-foreground">{currentModel.name}</span>
                    </>
                  )}
                  <span className="mono text-[10px] text-blue-400 animate-pulse">{formatCost(liveCost)}</span>
                </div>
                {/* Inline agent steps */}
                <TaskProgress progress={Math.min(1, streamingText.length / 200)} />
                {/* Live code mini preview */}
                <div className="mb-3">
                  <LiveCodePreview isGenerating={isGenerating} />
                </div>
                {chatMode === "collective" && <CollectiveBlock query={input} synthModelId={collectiveSynthModel} />}
                <div className="text-[13px] leading-relaxed text-foreground">
                  <Streamdown>{streamingText.replace("[COLLECTIVE]", "")}</Streamdown>
                  <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse ml-0.5 align-middle" />
                </div>
              </div>
            )}

            {/* Follow-up suggestions */}
            {showFollowUp && !isGenerating && (
              <div className="py-3">
                <div className="text-[10px] text-muted-foreground/50 mb-2 uppercase tracking-wider">Продолжить разговор</div>
                <div className="flex flex-wrap gap-1.5">
                  {FOLLOW_UP_SUGGESTIONS.slice(0, 3).map(s => (
                    <button key={s} onClick={() => handleSend(s)}
                      className="px-2.5 py-1 rounded-full bg-accent/50 hover:bg-accent border border-border text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Task plan bar + mini code thumbnail above input ── */}
      {isGenerating && (
        <div className="flex-shrink-0 px-4 pt-2 pb-1 space-y-2">
          {/* Mini live code thumbnail */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <LiveCodePreview isGenerating={isGenerating} />
            </div>
            {/* Task plan progress bar */}
            <div className="flex-1 min-w-0 rounded-xl border border-border/50 bg-accent/20 overflow-hidden">
              <TaskPlanBar progress={Math.min(1, streamingText.length / 200)} />
            </div>
          </div>
        </div>
      )}

      {/* ── Manus-style unified input card ── */}
      <InputCard
        input={input}
        setInput={setInput}
        isGenerating={isGenerating}
        handleSend={handleSend}
        handleStop={handleStop}
        capabilities={capabilities}
        setCapabilities={setCapabilities}
        chatMode={chatMode}
        setChatMode={setChatMode}
        showModePicker={showModePicker}
        setShowModePicker={setShowModePicker}
        showModelPicker={showModelPicker}
        setShowModelPicker={setShowModelPicker}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        textareaRef={textareaRef}
        liveCost={liveCost}
        agentIds={agentIds}
        setAgentIds={setAgentIds}
        collectiveModelIds={collectiveModelIds}
        setCollectiveModelIds={setCollectiveModelIds}
        collectiveSynthModel={collectiveSynthModel}
        setCollectiveSynthModel={setCollectiveSynthModel}
        onAgentModelOverridesChange={setAgentModelOverrides}
      />

      {/* LEGACY input area — hidden, kept for reference */}
      <div className="hidden border-t border-border px-4 py-3 flex-shrink-0">
        {/* Mode & Model selectors */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {/* Mode picker */}
          <div className="relative">
            <button onClick={() => { setShowModePicker(v => !v); setShowModelPicker(false); }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/50 hover:bg-accent text-[11px] text-foreground transition-colors">
              <span>{currentMode.icon}</span>
              <span>{currentMode.label}</span>
              <ChevronDown size={10} className="text-muted-foreground" />
            </button>
            {showModePicker && (
              <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 min-w-[180px]">
                {CHAT_MODES.map(mode => (
                  <button key={mode.id} onClick={() => { setChatMode(mode.id); setShowModePicker(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] hover:bg-accent transition-colors ${chatMode === mode.id ? "text-primary" : "text-foreground"}`}>
                    <span>{mode.icon}</span><span>{mode.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Model picker */}
          {chatMode !== "collective" && (
            <div className="relative">
              <button onClick={() => { setShowModelPicker(v => !v); setShowModePicker(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/50 hover:bg-accent text-[11px] text-foreground transition-colors">
                <span style={{ color: currentModel.color }}>{currentModel.icon}</span>
                <span>{currentModel.name}</span>
                <span className="mono text-[9px] text-muted-foreground">${currentModel.costOut}/M</span>
                <ChevronDown size={10} className="text-muted-foreground" />
              </button>
              {showModelPicker && (
                <div className="absolute bottom-full left-0 mb-1 bg-popover border border-border rounded-lg shadow-xl z-50 py-1 min-w-[280px] max-h-72 overflow-y-auto">
                  {["fast", "standard", "genius", "optimum"].map(tier => {
                    const tierModels = MODELS.filter(m => m.tier === tier);
                    if (!tierModels.length) return null;
                    return (
                      <div key={tier}>
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50">
                          {TIER_LABELS[tier]}
                        </div>
                        {tierModels.map(m => (
                          <button key={m.id} onClick={() => { setSelectedModel(m.id); setShowModelPicker(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent transition-colors ${selectedModel === m.id ? "bg-accent/50" : ""}`}>
                            <span className="text-[13px]" style={{ color: m.color }}>{m.icon}</span>
                            <div className="flex-1 text-left">
                              <div className="text-[12px] text-foreground">{m.name}</div>
                              <div className="text-[10px] text-muted-foreground">{m.provider}</div>
                            </div>
                            <div className="text-right">
                              <div className="mono text-[10px] text-muted-foreground">${m.costIn}/${m.costOut}</div>
                              <div className="text-[9px] text-muted-foreground/50">in/out /M</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {chatMode === "collective" && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20">
              <Brain size={11} className="text-primary" />
              <span className="text-[11px] text-primary">{collectiveModelIds.length} моделей</span>
              {collectiveSynthModel && (
                <>
                  <span className="text-primary/40">→</span>
                  <span className="text-[10px]" style={{ color: MODELS.find(m => m.id === collectiveSynthModel)?.color }}>
                    {MODELS.find(m => m.id === collectiveSynthModel)?.icon}
                  </span>
                  <span className="text-[11px] text-amber-400">{MODELS.find(m => m.id === collectiveSynthModel)?.name}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Capability Badges */}
        <div className="flex items-center gap-1.5 mb-2">
          {CAPABILITIES.map(cap => (
            <button
              key={cap.id}
              onClick={() => setCapabilities(prev => ({ ...prev, [cap.id]: !prev[cap.id] }))}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border transition-colors ${
                capabilities[cap.id]
                  ? `${cap.color} bg-accent/50 border-border`
                  : "text-muted-foreground/40 border-border/30 hover:border-border hover:text-muted-foreground"
              }`}
              title={cap.label}
            >
              {cap.icon}
              <span>{cap.label}</span>
            </button>
          ))}
        </div>

        {/* Textarea */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={chatMode === "collective" ? "Задайте вопрос — все модели ответят одновременно..." : "Введите запрос... (Enter — отправить, Shift+Enter — новая строка)"}
              rows={1}
              className="w-full bg-input border border-border rounded-lg px-3 py-2.5 text-[13px] text-foreground placeholder:text-muted-foreground resize-none outline-none focus:border-primary/50 transition-colors leading-relaxed"
              style={{ minHeight: "42px", maxHeight: "160px", overflowY: "auto" }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 160) + "px";
              }}
            />
          </div>
          {isGenerating ? (
            <button onClick={handleStop}
              className="flex-shrink-0 w-9 h-9 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 flex items-center justify-center transition-colors">
              <Square size={14} className="text-red-400 fill-red-400" />
            </button>
          ) : (
            <button onClick={() => handleSend()} disabled={!input.trim()}
              className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
              <Send size={14} className="text-primary-foreground" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground/40">Enter — отправить · Shift+Enter — новая строка</span>
          {isGenerating && <span className="mono text-[10px] text-blue-400 animate-pulse">Генерация... {formatCost(liveCost)}</span>}
        </div>
      </div>
    </div>
  );
}
