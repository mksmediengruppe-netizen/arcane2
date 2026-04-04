// Design: Refined Dark SaaS — Chat Panel
// Features: EmptyChat, Capability Badges, Stop button, Follow-up suggestions, Edit message, Reactions
import { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "@/contexts/AppContext";
import { MODELS, formatCost, Message } from "@/lib/mockData";
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
  { id: "normal",     label: "Обычный",          icon: "💬" },
  { id: "collective", label: "Коллективный разум", icon: "🧠" },
  { id: "auto",       label: "AUTO",              icon: "⚡" },
  { id: "manual",     label: "MANUAL",            icon: "🎛️" },
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
                {/* Timer */}
                {(isDone || isActive) && (
                  <StepTimer
                    startedAt={isActive ? stepStartTimes[i] : null}
                    finalMs={isDone ? stepFinalMs[i] : null}
                  />
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

function CollectiveBlock({ query }: { query: string }) {
  const [expanded, setExpanded] = useState(false);
  const opinions = COLLECTIVE_MODELS.map(mid => {
    const m = MODELS.find(x => x.id === mid)!;
    return { model: m, text: `Краткое мнение от ${m.name}: рекомендую подход через ${mid.includes("claude") ? "функциональную декомпозицию" : mid.includes("gpt") ? "объектно-ориентированную архитектуру" : "минималистичный алгоритм"}.` };
  });
  const synth = MODELS.find(m => m.id === COLLECTIVE_SYNTH)!;
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
        <span className="text-[10px] text-muted-foreground/50">{msg.timestamp}</span>
        {msg.cost && (
          <span className="mono text-[10px] text-muted-foreground/50">{formatCost(msg.cost)}</span>
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
interface UploadedFile { id: string; name: string; size: number; type: string; }

// ── InputCard ──────────────────────────────────────────────────────────────────────────
function InputCard({
  input, setInput, isGenerating, handleSend, handleStop,
  capabilities, setCapabilities, chatMode, setChatMode,
  showModePicker, setShowModePicker, showModelPicker, setShowModelPicker,
  selectedModel, setSelectedModel, textareaRef, liveCost,
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
}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported] = useState(() => typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window));
  const fileInputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const currentMode = CHAT_MODES.find(m => m.id === chatMode) || CHAT_MODES[0];
  const currentModel = MODELS.find(m => m.id === selectedModel) || MODELS[0];

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming);
    const chips: UploadedFile[] = arr.map(f => ({
      id: Math.random().toString(36).slice(2),
      name: f.name, size: f.size, type: f.type,
    }));
    setFiles(prev => [...prev, ...chips]);
    toast.success(`Загружено ${arr.length} файл${arr.length > 1 ? "а" : ""}`);
  }, []);

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
          : "border-border bg-input/60 hover:border-border/80 focus-within:border-primary/40"
      }`}>

        {/* Uploaded file chips */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
            {files.map(f => (
              <div key={f.id} className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-accent border border-border text-[11px] text-foreground max-w-[180px]">
                <Paperclip size={10} className="text-muted-foreground flex-shrink-0" />
                <span className="truncate">{f.name}</span>
                <span className="text-muted-foreground/60 flex-shrink-0">{formatFileSize(f.size)}</span>
                <button onClick={() => setFiles(prev => prev.filter(x => x.id !== f.id))}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors ml-0.5">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
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
              )}
            </div>
          )}

          {chatMode === "collective" && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-primary">
              <Brain size={10} />
              <span>{COLLECTIVE_MODELS.length} моделей + синтез</span>
            </div>
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stopRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeTask = state.activeProjectId && state.activeTaskId
    ? state.projects.find(p => p.id === state.activeProjectId)?.tasks.find(t => t.id === state.activeTaskId)
    : null;

  const activeProject = state.projects.find(p => p.id === state.activeProjectId);
  const projectCost = activeProject?.tasks.reduce((s, t) => s + t.cost, 0) || 0;

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
    const userMsg: Message = {
      id: `m${Date.now()}`, role: "user", content: text,
      timestamp: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
    };
    dispatch({ type: "ADD_MESSAGE", projectId: state.activeProjectId, taskId: state.activeTaskId, message: userMsg });
    dispatch({ type: "UPDATE_TASK_STATUS", projectId: state.activeProjectId, taskId: state.activeTaskId, status: "running" });
    setInput("");
    setIsGenerating(true);
    setStreamingText("");
    setLiveCost(0);
    stopRef.current = false;
    setShowFollowUp(false);

    const fullText = chatMode === "collective"
      ? "[COLLECTIVE]" + simulateResponse(activeTask?.name || "задача", COLLECTIVE_SYNTH)
      : simulateResponse(activeTask?.name || "задача", selectedModel);

    const model = MODELS.find(m => m.id === selectedModel);
    const costPerChar = (model?.costOut || 5) / 1_000_000 / 4;
    let i = 0;
    intervalRef.current = setInterval(() => {
      if (stopRef.current) return;
      if (i >= fullText.length) {
        clearInterval(intervalRef.current!);
        const finalCost = parseFloat((fullText.length * costPerChar).toFixed(4));
        const aiMsg: Message = {
          id: `m${Date.now()}`, role: "assistant",
          model: chatMode === "collective" ? COLLECTIVE_SYNTH : selectedModel,
          content: chatMode === "collective" ? fullText.replace("[COLLECTIVE]", "") : fullText,
          timestamp: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
          tokens: { in: Math.floor(Math.random() * 1000 + 500), out: Math.floor(fullText.length / 4) },
          cost: finalCost,
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
                {chatMode === "collective" && <CollectiveBlock query={input} />}
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
              <span className="text-[11px] text-primary">{COLLECTIVE_MODELS.length} моделей + синтез</span>
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
