// Design: Refined Dark SaaS — Right Inspector Panel
// Tabs: Live, Steps, Thinking, Preview, Terminal, Artifacts, Budget
import { useState, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { formatCost } from "@/lib/mockData";
import LiveCodePreview, { StepPayload } from "./LiveCodePreview";
import {
  ChevronRight, X, Terminal, FileText, Activity, DollarSign,
  Layers, Brain, Monitor, BookOpen, Plus, Trash2
} from "lucide-react";
import { toast } from "sonner";

type RightTab = "live" | "steps" | "thinking" | "preview" | "terminal" | "artifacts" | "budget" | "memory";

// Use ENRICHED_STEPS from LiveCodePreview instead of local MOCK_STEPS











const MEMORY_TYPE_COLORS: Record<string, string> = {
  fact:    "text-blue-400 bg-blue-400/10 border-blue-400/20",
  pref:    "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  context: "text-purple-400 bg-purple-400/10 border-purple-400/20",
};

const MEMORY_TYPE_LABELS: Record<string, string> = {
  fact: "Факт", pref: "Предпочтение", context: "Контекст",
};

const TOOL_COLORS: Record<string, string> = {
  Browser:    "text-blue-400",
  SSH:        "text-emerald-400",
  FileSystem: "text-yellow-400",
  LLM:        "text-purple-400",
};



export default function RightPanel() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<RightTab>("steps");

  const [memories, setMemories] = useState<Array<{id: string; type: string; content: string; project: string; created: string}>>([]);
  const [newMemory, setNewMemory] = useState("");
  const [selectedStep, setSelectedStep] = useState<StepPayload | null>(null);

  function handleStepClick(step: StepPayload) {
    setSelectedStep(step);
    setTab("live");
  }

  const activeTask = state.activeProjectId && state.activeTaskId
    ? state.projects.find(p => p.id === state.activeProjectId)?.tasks.find(t => t.id === state.activeTaskId)
    : null;

  if (!state.rightPanelOpen) {
    return (
      <div className="w-10 flex flex-col items-center py-3 gap-3 border-l border-border bg-sidebar flex-shrink-0">
        <button onClick={() => dispatch({ type: "TOGGLE_RIGHT_PANEL" })}
          className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight size={13} className="rotate-180" />
        </button>
      </div>
    );
  }

  const tabs: { id: RightTab; icon: React.ReactNode; label: string }[] = [
    { id: "live",      icon: <Activity size={12} />,   label: "Live" },
    { id: "steps",     icon: <Layers size={12} />,     label: "Шаги" },
    { id: "thinking",  icon: <Brain size={12} />,      label: "Мышление" },
    { id: "preview",   icon: <Monitor size={12} />,    label: "Превью" },
    { id: "terminal",  icon: <Terminal size={12} />,   label: "Логи" },
    { id: "artifacts", icon: <FileText size={12} />,   label: "Файлы" },
    { id: "budget",    icon: <DollarSign size={12} />, label: "Бюджет" },
    { id: "memory",    icon: <BookOpen size={12} />,   label: "Память" },
  ];

  const taskCost = activeTask?.cost || 0;
  const budgetLimit = activeTask?.budget ?? 5.0;
  const budgetPct = Math.min(100, (taskCost / budgetLimit) * 100);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");
  const budgetInputRef = useRef<HTMLInputElement>(null);

  function startEditBudget() {
    setBudgetInput(budgetLimit.toFixed(2));
    setEditingBudget(true);
    setTimeout(() => budgetInputRef.current?.select(), 50);
  }

  function saveBudget() {
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val > 0 && activeTask) {
      dispatch({ type: "UPDATE_TASK_BUDGET", taskId: activeTask.id, budget: val });
      toast.success(`Лимит обновлён: $${val.toFixed(2)}`);
    }
    setEditingBudget(false);
  }



  return (
    <div className="flex flex-col h-full bg-sidebar border-l border-border overflow-hidden flex-shrink-0"
      style={{ width: state.rightPanelWidth }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border flex-shrink-0">
        <span className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">Инспекция</span>
        <button onClick={() => dispatch({ type: "TOGGLE_RIGHT_PANEL" })}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
          <X size={13} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-2.5 py-2 text-[10px] font-medium whitespace-nowrap transition-colors border-b-2 ${
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {/* LIVE */}
        {tab === "live" && (
          <div className="flex flex-col h-full">
            {/* Status bar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50 flex-shrink-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${activeTask?.status === "running" ? "bg-blue-400 animate-pulse" : "bg-zinc-600"}`} />
              <span className={`text-[11px] font-medium ${activeTask?.status === "running" ? "text-blue-400" : "text-muted-foreground"}`}>
                {activeTask?.status === "running" ? "Выполняется..." : "Задача завершена"}
              </span>
              {activeTask?.status === "running" && (
                <div className="ml-auto flex items-center gap-1.5">
                  <div className="flex-1 bg-muted rounded-full h-1" style={{ width: "60px" }}>
                    <div className="bg-blue-400 h-1 rounded-full animate-pulse" style={{ width: "65%" }} />
                  </div>
                  <span className="mono text-[10px] text-muted-foreground">5/8</span>
                </div>
              )}
            </div>

            {/* Live code preview — expanded */}
            {selectedStep ? (
              <div className="flex-1 overflow-hidden">
                <LiveCodePreview
                  isGenerating={false}
                  selectedStep={selectedStep}
                  expanded={true}
                  onBack={() => setSelectedStep(null)}
                />
              </div>
            ) : activeTask?.status === "running" ? (
              <div className="flex-1 overflow-hidden">
                <LiveCodePreview isGenerating={true} expanded={true} />
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                <Activity size={24} className="text-muted-foreground/30 mb-2" />
                <div className="text-[12px] text-muted-foreground">Нет активных задач</div>
                <div className="text-[11px] text-muted-foreground/50 mt-1">Кликните на шаг во вкладке "Шаги"</div>
              </div>
            )}
          </div>
        )}

        {/* STEPS */}
        {tab === "steps" && (
          <div className="p-2">
            {/* Agents used in this task */}
            {activeTask?.usedAgents && activeTask.usedAgents.length > 0 && (
              <div className="mb-3 px-2">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-[9px] font-semibold text-muted-foreground/50 uppercase tracking-wider">Агенты</span>
                  {activeTask.chatMode && (
                    <span className="text-[9px] text-muted-foreground/40 ml-auto">режим: {activeTask.chatMode}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {activeTask.usedAgents.map(rec => {
                    const AGENT_META: Record<string, { label: string; icon: string; color: string }> = {
                      manus:        { label: "Manus",           icon: "✦",  color: "text-primary" },
                      orchestrator: { label: "Оркестратор", icon: "🎯", color: "text-violet-400" },
                      planner:      { label: "Планировщик", icon: "📋", color: "text-blue-400" },
                      coder:        { label: "Кодер",        icon: "💻", color: "text-emerald-400" },
                      reviewer:     { label: "Ревьюер",      icon: "🔍", color: "text-amber-400" },
                      researcher:   { label: "Исследователь", icon: "🔬", color: "text-cyan-400" },
                      writer:       { label: "Писатель",      icon: "✍️", color: "text-pink-400" },
                      analyst:      { label: "Аналитик",      icon: "📊", color: "text-orange-400" },
                      tester:       { label: "Тестировщик",  icon: "🧪", color: "text-red-400" },
                    };
                    const meta = AGENT_META[rec.agentId] || { label: rec.agentId, icon: "🤖", color: "text-muted-foreground" };
                    const modelShort = rec.modelId.replace("claude-", "C.").replace("gpt-", "G.").replace("gemini-", "Gm.").replace("deepseek-", "DS.");
                    return (
                      <div key={rec.agentId}
                        title={`${meta.label} → ${rec.modelId}${rec.modelOverridden ? " (изменена вручную)" : ""}`}
                        className={`flex flex-col px-1.5 py-1 rounded text-[10px] bg-accent/30 border ${rec.modelOverridden ? "border-amber-500/30" : "border-transparent"}`}>
                        <div className={`flex items-center gap-1 ${meta.color}`}>
                          <span>{meta.icon}</span>
                          <span className="font-medium">{meta.label}</span>
                          {rec.modelOverridden && <span className="text-amber-400 text-[8px]">✎</span>}
                        </div>
                        <div className="text-[9px] text-muted-foreground/60 mt-0.5">{modelShort}</div>
                      </div>
                    );
                  })}
                </div>
                {activeTask.chatMode === "collective" && activeTask.collectiveModelIds && (
                  <div className="mt-1.5 text-[10px] text-muted-foreground/50">
                    Модели: {activeTask.collectiveModelIds.join(", ")}
                  </div>
                )}
                <div className="mt-1.5 border-t border-border/30" />
              </div>
            )}
            <div className="px-2 py-1.5 mb-1">
              <span className="text-[10px] text-muted-foreground/50">Кликните на шаг чтобы увидеть код</span>
            </div>
            {activeTask?.status === "running" ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin mb-3" />
                <div className="text-[12px] text-muted-foreground">Задача выполняется...</div>
                <div className="text-[11px] text-muted-foreground/50 mt-1">Шаги появятся по мере выполнения</div>
              </div>
            ) : activeTask ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Layers size={22} className="text-muted-foreground/30 mb-2" />
                <div className="text-[12px] text-muted-foreground">Детальные шаги недоступны</div>
                <div className="text-[11px] text-muted-foreground/50 mt-1 max-w-[180px]">Шаги выполнения отображаются в реальном времени во время работы агента</div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Layers size={22} className="text-muted-foreground/30 mb-2" />
                <div className="text-[12px] text-muted-foreground">Нет активной задачи</div>
              </div>
            )}
          </div>
        )}

        {/* THINKING */}
        {tab === "thinking" && (
          <div className="p-3">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={13} className="text-purple-400" />
              <span className="text-[11px] font-medium text-foreground">Процесс мышления</span>
            </div>
            {activeTask?.messages && activeTask.messages.some(m => m.thinking) ? (
              activeTask.messages.filter(m => m.thinking).map(m => (
                <div key={m.id} className="mb-3">
                  <div className="bg-purple-400/5 border border-purple-400/20 rounded-lg p-3">
                    <pre className="text-[11px] text-foreground/70 font-mono whitespace-pre-wrap leading-relaxed">{m.thinking}</pre>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    <span>Модель: {m.model || "—"}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Brain size={22} className="text-muted-foreground/30 mb-2" />
                <div className="text-[12px] text-muted-foreground">Нет данных о мышлении</div>
                <div className="text-[11px] text-muted-foreground/50 mt-1">Доступно для моделей с расширенным мышлением (o1, R1)</div>
              </div>
            )}
          </div>
        )}

        {/* PREVIEW */}
        {tab === "preview" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <Monitor size={24} className="text-muted-foreground/30 mb-2" />
              <div className="text-[12px] text-muted-foreground">Превью недоступно</div>
              <div className="text-[11px] text-muted-foreground/50 mt-1 max-w-[180px]">Превью генерируется когда агент создаёт HTML-страницы или веб-интерфейсы</div>
            </div>
          </div>
        )}

        {/* TERMINAL */}
        {tab === "terminal" && (
          <div className="p-3 font-mono text-[11px] leading-relaxed">
            {activeTask?.messages && activeTask.messages.length > 0 ? (
              <>
                {activeTask.messages.map((m, i) => (
                  <div key={m.id || i} className="mb-1">
                    <span className="text-muted-foreground/50">[{m.timestamp || "—"}] </span>
                    <span className={m.role === "user" ? "text-blue-400" : "text-emerald-400/80"}>
                      {m.role === "user" ? "USER" : "AGENT"}
                    </span>
                    <span className="text-muted-foreground/60"> {m.content.slice(0, 200)}{m.content.length > 200 ? "..." : ""}</span>
                  </div>
                ))}
                {activeTask.status === "error" && (
                  <div className="mt-2 text-red-400">[ERROR] Задача завершилась с ошибкой</div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Terminal size={22} className="text-muted-foreground/30 mb-2" />
                <div className="text-[12px] text-muted-foreground">Нет логов</div>
                <div className="text-[11px] text-muted-foreground/50 mt-1">Логи появятся после запуска задачи</div>
              </div>
            )}
          </div>
        )}

        {/* ARTIFACTS */}
        {tab === "artifacts" && (
          <div className="p-3">
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <FileText size={22} className="text-muted-foreground/30 mb-2" />
              <div className="text-[12px] text-muted-foreground">Нет файлов</div>
              <div className="text-[11px] text-muted-foreground/50 mt-1 max-w-[180px]">Файлы появятся когда агент создаст или скачает документы в ходе задачи</div>
            </div>
          </div>
        )}

        {/* MEMORY */}
        {tab === "memory" && (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Контекстная память агента</span>
              <span className="text-[10px] text-muted-foreground">{memories.length} записей</span>
            </div>

            {/* Add memory */}
            <div className="flex gap-1.5">
              <input
                value={newMemory}
                onChange={e => setNewMemory(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && newMemory.trim()) {
                    setMemories(prev => [{ id: `m${Date.now()}`, type: "fact", content: newMemory.trim(), project: "Глобальный", created: "сейчас" }, ...prev]);
                    setNewMemory("");
                  }
                }}
                placeholder="Добавить факт..."
                className="flex-1 bg-input border border-border rounded px-2 py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors"
              />
              <button
                onClick={() => {
                  if (newMemory.trim()) {
                    setMemories(prev => [{ id: `m${Date.now()}`, type: "fact", content: newMemory.trim(), project: "Глобальный", created: "сейчас" }, ...prev]);
                    setNewMemory("");
                  }
                }}
                className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors">
                <Plus size={12} />
              </button>
            </div>

            {/* Memory list */}
            <div className="space-y-2">
              {memories.map(mem => (
                <div key={mem.id} className="group relative bg-card border border-border rounded-lg p-2.5 hover:border-primary/30 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${MEMORY_TYPE_COLORS[mem.type]}`}>
                          {MEMORY_TYPE_LABELS[mem.type]}
                        </span>
                        <span className="text-[9px] text-muted-foreground/50">{mem.project}</span>
                        <span className="text-[9px] text-muted-foreground/40">{mem.created}</span>
                      </div>
                      <div className="text-[11px] text-foreground/80 leading-relaxed">{mem.content}</div>
                    </div>
                    <button
                      onClick={() => setMemories(prev => prev.filter(m => m.id !== mem.id))}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-400/10 text-muted-foreground hover:text-red-400 transition-all flex-shrink-0">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-2 text-[10px] text-muted-foreground">
              Память используется агентом как контекст при следующих запросах
            </div>
          </div>
        )}

        {/* BUDGET */}
        {tab === "budget" && (
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground">Текущая задача</span>
                <span className={`mono text-[13px] font-semibold ${budgetPct > 80 ? "text-yellow-400" : "text-foreground"}`}>
                  {formatCost(taskCost)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <div className={`h-1.5 rounded-full transition-all ${budgetPct > 80 ? "bg-yellow-400" : "bg-primary"}`}
                  style={{ width: `${budgetPct}%` }} />
              </div>
              <div className="flex justify-between mt-1 items-center">
                <div className="flex items-center gap-1">
                  {editingBudget ? (
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-muted-foreground">$</span>
                      <input
                        ref={budgetInputRef}
                        value={budgetInput}
                        onChange={e => setBudgetInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveBudget(); if (e.key === "Escape") setEditingBudget(false); }}
                        onBlur={saveBudget}
                        className="w-16 bg-input border border-primary/50 rounded px-1.5 py-0.5 text-[11px] mono text-foreground outline-none"
                      />
                    </div>
                  ) : (
                    <button
                      onClick={startEditBudget}
                      className="text-[10px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 group"
                      title="Нажмите чтобы изменить">
                      Лимит: {formatCost(budgetLimit)}
                      <span className="opacity-0 group-hover:opacity-100 text-[9px] text-primary transition-opacity">✒</span>
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{budgetPct.toFixed(0)}%</span>
              </div>
            </div>

            {budgetPct >= 90 && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-yellow-400/10 border border-yellow-400/30 rounded-lg">
                <span className="text-yellow-400 mt-0.5 flex-shrink-0">⚠</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-yellow-400 font-medium">
                    {budgetPct >= 100 ? "Бюджет исчерпан" : `Использовано ${budgetPct.toFixed(0)}% лимита`}
                  </div>
                  <div className="text-[10px] text-yellow-400/70 mt-0.5">
                    {formatCost(taskCost)} / {formatCost(budgetLimit)}
                  </div>
                  <div className="flex gap-2 mt-2">
                    {[1.5, 2, 5].map(mult => (
                      <button
                        key={mult}
                        onClick={() => {
                          if (!activeTask) return;
                          const newLimit = parseFloat((budgetLimit * mult).toFixed(2));
                          dispatch({ type: "UPDATE_TASK_BUDGET", taskId: activeTask.id, budget: newLimit });
                          toast.success(`Лимит увеличен до $${newLimit.toFixed(2)}`);
                        }}
                        className="text-[10px] px-2 py-1 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 rounded transition-colors">
                        ×{mult}
                      </button>
                    ))}
                    <button
                      onClick={startEditBudget}
                      className="text-[10px] px-2 py-1 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 rounded transition-colors">
                      Свой
                    </button>
                  </div>
                </div>
              </div>
            )}



            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">Итого по проекту</span>
                <span className="mono text-[13px] font-semibold text-foreground">
                  {formatCost(
                    state.projects.find(p => p.id === state.activeProjectId)
                      ?.tasks.reduce((s, t) => s + t.cost, 0) || 0
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
