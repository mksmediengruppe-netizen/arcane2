// === CHAT PANEL — Document-style chat, model selector, Collective Mind mode ===
import { useState, useRef, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { MODELS, formatCost, Message } from "@/lib/mockData";
import { Send, ChevronDown, Brain, Zap, ChevronRight, Copy, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

const TIER_LABELS: Record<string, string> = {
  fast: "Быстрый", standard: "Стандарт", genius: "Гений", optimum: "Оптимум"
};

const CHAT_MODES = [
  { id: "normal",     label: "Обычный",          icon: "💬" },
  { id: "collective", label: "Коллективный разум", icon: "🧠" },
  { id: "auto",       label: "AUTO",              icon: "⚡" },
  { id: "manual",     label: "MANUAL",            icon: "🎛️" },
];

// Simulated streaming response
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

      {/* Opinions accordion */}
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between text-left mb-2 hover:opacity-80 transition-opacity">
        <span className="text-[11px] text-muted-foreground">
          {COLLECTIVE_MODELS.length} моделей опрошено
        </span>
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

      {/* Synthesis */}
      <div className="border-t border-border/50 pt-2.5">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="text-[10px]" style={{ color: synth.color }}>{synth.icon}</span>
          <span className="text-[10px] font-semibold text-foreground">{synth.name}</span>
          <span className="text-[10px] text-muted-foreground">— синтез</span>
        </div>
        <div className="text-[12px] text-foreground">
          На основе анализа {COLLECTIVE_MODELS.length} моделей: оптимальным является комбинированный подход, сочетающий функциональную декомпозицию с чёткой архитектурой модулей. Рекомендуется начать с базовой структуры, затем итеративно добавлять функциональность.
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
      {open && <div className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{text}</div>}
    </div>
  );
}

function MessageRow({ msg }: { msg: Message }) {
  const model = MODELS.find(m => m.id === msg.model);
  const isUser = msg.role === "user";

  return (
    <div className={`py-3 border-b border-border/40 group ${isUser ? "msg-user" : "msg-ai"}`}>
      {/* Header */}
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
        {/* Actions (visible on hover) */}
        {!isUser && (
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => { navigator.clipboard.writeText(msg.content); toast.success("Скопировано"); }}
              className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <Copy size={11} />
            </button>
            <button className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <ThumbsUp size={11} />
            </button>
            <button className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <ThumbsDown size={11} />
            </button>
            <button className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
              <RotateCcw size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Thinking */}
      {msg.thinking && <ThinkingBlock text={msg.thinking} />}

      {/* Content */}
      <div className={`text-[13px] leading-relaxed ${isUser ? "text-foreground/90" : "text-foreground"}`}>
        <Streamdown>{msg.content}</Streamdown>
      </div>

      {/* Token stats */}
      {msg.tokens && (
        <div className="mt-2 flex items-center gap-3">
          <span className="mono text-[10px] text-muted-foreground/40">↑{msg.tokens.in} ↓{msg.tokens.out} токенов</span>
        </div>
      )}
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeTask = state.activeProjectId && state.activeTaskId
    ? state.projects.find(p => p.id === state.activeProjectId)?.tasks.find(t => t.id === state.activeTaskId)
    : null;

  const activeProject = state.projects.find(p => p.id === state.activeProjectId);
  const projectCost = activeProject?.tasks.reduce((s, t) => s + t.cost, 0) || 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeTask?.messages, streamingText]);

  const handleSend = async () => {
    if (!input.trim() || !state.activeProjectId || !state.activeTaskId || isGenerating) return;
    const userMsg: Message = {
      id: `m${Date.now()}`, role: "user", content: input.trim(), timestamp: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
    };
    dispatch({ type: "ADD_MESSAGE", projectId: state.activeProjectId, taskId: state.activeTaskId, message: userMsg });
    dispatch({ type: "UPDATE_TASK_STATUS", projectId: state.activeProjectId, taskId: state.activeTaskId, status: "running" });
    setInput("");
    setIsGenerating(true);
    setStreamingText("");
    setLiveCost(0);

    // Simulate streaming
    const fullText = chatMode === "collective"
      ? "[COLLECTIVE]" + simulateResponse(activeTask?.name || "задача", COLLECTIVE_SYNTH)
      : simulateResponse(activeTask?.name || "задача", selectedModel);

    const model = MODELS.find(m => m.id === selectedModel);
    const costPerChar = (model?.costOut || 5) / 1_000_000 / 4;
    let i = 0;
    const interval = setInterval(() => {
      if (i >= fullText.length) {
        clearInterval(interval);
        const finalCost = parseFloat((fullText.length * costPerChar).toFixed(4));
        const aiMsg: Message = {
          id: `m${Date.now()}`, role: "assistant", model: chatMode === "collective" ? COLLECTIVE_SYNTH : selectedModel,
          content: chatMode === "collective" ? fullText.replace("[COLLECTIVE]", "") : fullText,
          timestamp: new Date().toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }),
          tokens: { in: Math.floor(Math.random() * 1000 + 500), out: Math.floor(fullText.length / 4) },
          cost: finalCost,
        };
        dispatch({ type: "ADD_MESSAGE", projectId: state.activeProjectId!, taskId: state.activeTaskId!, message: aiMsg });
        dispatch({ type: "UPDATE_TASK_STATUS", projectId: state.activeProjectId!, taskId: state.activeTaskId!, status: "done", duration: `${Math.floor(Math.random() * 5 + 1)}m ${Math.floor(Math.random() * 59)}s` });
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
            {/* Live cost counter */}
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
          <span className={`w-2 h-2 rounded-full ${
            activeTask.status === "running" ? "bg-blue-400 animate-pulse" :
            activeTask.status === "done" ? "bg-emerald-400" :
            activeTask.status === "error" ? "bg-red-400" :
            activeTask.status === "warning" ? "bg-yellow-400" : "bg-zinc-600"
          }`} />
          <span className="text-[11px] text-muted-foreground capitalize">{activeTask.status}</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-2">
        {activeTask.messages.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="text-[13px] text-muted-foreground">Начните диалог — введите запрос ниже</div>
          </div>
        )}
        {activeTask.messages.map(msg => (
          msg.content.startsWith("[COLLECTIVE]") ? null : <MessageRow key={msg.id} msg={msg} />
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
            {chatMode === "collective" && <CollectiveBlock query={input} />}
            <div className="text-[13px] leading-relaxed text-foreground">
              <Streamdown>{streamingText.replace("[COLLECTIVE]", "")}</Streamdown>
              <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse ml-0.5 align-middle" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border px-4 py-3 flex-shrink-0">
        {/* Mode & Model selectors */}
        <div className="flex items-center gap-2 mb-2">
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

        {/* Textarea */}
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
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
          <button onClick={handleSend} disabled={!input.trim() || isGenerating}
            className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors">
            {isGenerating
              ? <span className="w-3 h-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              : <Send size={14} className="text-primary-foreground" />
            }
          </button>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground/40">Enter — отправить · Shift+Enter — новая строка</span>
          {isGenerating && <span className="mono text-[10px] text-blue-400 animate-pulse">Генерация... {formatCost(liveCost)}</span>}
        </div>
      </div>
    </div>
  );
}
