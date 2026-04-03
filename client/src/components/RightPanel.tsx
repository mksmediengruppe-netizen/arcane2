// === RIGHT PANEL — Agent Inspection: Live, Steps, Terminal, Artifacts, Budget ===
import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { formatCost } from "@/lib/mockData";
import { ChevronRight, X, Terminal, FileText, Activity, DollarSign, Layers } from "lucide-react";

type RightTab = "live" | "steps" | "terminal" | "artifacts" | "budget";

const MOCK_STEPS = [
  { id: 1, tool: "Browser",    action: "Открыл https://ubuntu.com/download",          time: "0.3s",  cost: 0.0002 },
  { id: 2, tool: "Browser",    action: "Извлёк инструкции по установке",               time: "0.8s",  cost: 0.0012 },
  { id: 3, tool: "SSH",        action: "Подключился к серверу 192.168.1.100",          time: "0.1s",  cost: 0.0001 },
  { id: 4, tool: "SSH",        action: "Выполнил: apt update && apt upgrade -y",       time: "45.2s", cost: 0.0089 },
  { id: 5, tool: "SSH",        action: "Установил nginx, php8.1-fpm, mysql-server",    time: "32.1s", cost: 0.0067 },
  { id: 6, tool: "FileSystem", action: "Создал /etc/nginx/sites-available/bitrix.conf","time": "0.1s", cost: 0.0001 },
  { id: 7, tool: "SSH",        action: "Перезапустил nginx и php-fpm",                 time: "2.3s",  cost: 0.0004 },
  { id: 8, tool: "LLM",        action: "Сгенерировал итоговый отчёт",                  time: "3.8s",  cost: 0.1240 },
];

const MOCK_LOGS = [
  "[10:00:01] INFO  Task started: Установка Bitrix на сервер",
  "[10:00:01] INFO  Model: claude-sonnet-4.6 | Tier: standard",
  "[10:00:02] INFO  Tool: Browser → GET https://ubuntu.com/download",
  "[10:00:03] INFO  Browser: Page loaded (2.1s, 142KB)",
  "[10:00:04] INFO  LLM: Extracted installation instructions",
  "[10:00:05] INFO  Tool: SSH → connect 192.168.1.100:22",
  "[10:00:05] INFO  SSH: Connected as root",
  "[10:00:06] INFO  SSH: $ apt update",
  "[10:00:51] INFO  SSH: 47 packages upgraded",
  "[10:01:02] INFO  SSH: $ apt install -y nginx php8.1-fpm mysql-server",
  "[10:02:34] INFO  SSH: Installation complete",
  "[10:02:35] INFO  Tool: FileSystem → write /etc/nginx/sites-available/bitrix.conf",
  "[10:02:36] INFO  SSH: $ systemctl restart nginx php8.1-fpm",
  "[10:02:38] INFO  LLM: Generating final report (tokens_in=1240, tokens_out=3850)",
  "[10:04:12] INFO  Task completed. Cost: $1.2400 | Duration: 4m 12s",
];

const MOCK_ARTIFACTS = [
  { name: "bitrix.conf",        type: "nginx",  size: "1.2 KB" },
  { name: "install_report.md",  type: "doc",    size: "3.8 KB" },
  { name: "mysql_setup.sql",    type: "sql",    size: "0.4 KB" },
];

const TOOL_COLORS: Record<string, string> = {
  Browser:    "text-blue-400",
  SSH:        "text-emerald-400",
  FileSystem: "text-yellow-400",
  LLM:        "text-purple-400",
};

export default function RightPanel() {
  const { state, dispatch } = useApp();
  const [tab, setTab] = useState<RightTab>("steps");

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
    { id: "terminal",  icon: <Terminal size={12} />,   label: "Логи" },
    { id: "artifacts", icon: <FileText size={12} />,   label: "Файлы" },
    { id: "budget",    icon: <DollarSign size={12} />, label: "Бюджет" },
  ];

  const taskCost = activeTask?.cost || 0;
  const budgetLimit = 5.0;
  const budgetPct = Math.min(100, (taskCost / budgetLimit) * 100);

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
            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium whitespace-nowrap transition-colors border-b-2 ${
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
          <div className="p-4">
            <div className={`flex items-center gap-2 mb-4 ${activeTask?.status === "running" ? "text-blue-400" : "text-muted-foreground"}`}>
              <span className={`w-2 h-2 rounded-full ${activeTask?.status === "running" ? "bg-blue-400 animate-pulse" : "bg-zinc-600"}`} />
              <span className="text-[12px] font-medium">
                {activeTask?.status === "running" ? "Выполняется..." : "Задача завершена"}
              </span>
            </div>
            {activeTask?.status === "running" && (
              <div className="space-y-3">
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Текущее действие</div>
                  <div className="text-[12px] text-foreground">🌐 Открывает страницу документации...</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider">Прогресс</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-1.5">
                      <div className="bg-blue-400 h-1.5 rounded-full animate-pulse" style={{ width: "65%" }} />
                    </div>
                    <span className="mono text-[11px] text-muted-foreground">Шаг 5/8</span>
                  </div>
                </div>
              </div>
            )}
            {activeTask?.status !== "running" && (
              <div className="text-center py-8 text-muted-foreground">
                <Activity size={24} className="mx-auto mb-2 opacity-30" />
                <div className="text-[12px]">Нет активных задач</div>
              </div>
            )}
          </div>
        )}

        {/* STEPS */}
        {tab === "steps" && (
          <div className="p-2">
            {MOCK_STEPS.map((step, i) => (
              <div key={step.id} className="flex gap-2.5 px-2 py-2 hover:bg-accent/30 rounded-md transition-colors">
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <span className="mono text-[10px] text-muted-foreground/50 w-4 text-right">{i + 1}</span>
                  {i < MOCK_STEPS.length - 1 && <div className="w-px h-3 bg-border" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={`text-[10px] font-semibold ${TOOL_COLORS[step.tool] || "text-muted-foreground"}`}>
                      {step.tool}
                    </span>
                    <span className="mono text-[10px] text-muted-foreground/50">{step.time}</span>
                    <span className="mono text-[10px] text-muted-foreground/50">{formatCost(step.cost)}</span>
                  </div>
                  <div className="text-[11px] text-foreground/70 truncate">{step.action}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TERMINAL */}
        {tab === "terminal" && (
          <div className="p-3 font-mono text-[11px] leading-relaxed">
            {MOCK_LOGS.map((line, i) => {
              const isError = line.includes("ERROR");
              const isWarn  = line.includes("WARN");
              return (
                <div key={i} className={`${isError ? "text-red-400" : isWarn ? "text-yellow-400" : "text-emerald-400/80"} hover:bg-accent/20 px-1 rounded`}>
                  {line}
                </div>
              );
            })}
          </div>
        )}

        {/* ARTIFACTS */}
        {tab === "artifacts" && (
          <div className="p-3 space-y-2">
            {MOCK_ARTIFACTS.map(f => (
              <div key={f.name} className="flex items-center gap-3 px-3 py-2.5 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors cursor-pointer">
                <FileText size={14} className="text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] text-foreground truncate">{f.name}</div>
                  <div className="text-[10px] text-muted-foreground">{f.type} · {f.size}</div>
                </div>
              </div>
            ))}
            {MOCK_ARTIFACTS.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText size={24} className="mx-auto mb-2 opacity-30" />
                <div className="text-[12px]">Нет артефактов</div>
              </div>
            )}
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
              <div className="flex justify-between mt-1">
                <span className="text-[10px] text-muted-foreground">Лимит: {formatCost(budgetLimit)}</span>
                <span className="text-[10px] text-muted-foreground">{budgetPct.toFixed(0)}%</span>
              </div>
            </div>

            <div className="border-t border-border pt-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Разбивка по шагам</div>
              {MOCK_STEPS.map(step => (
                <div key={step.id} className="flex items-center justify-between py-1">
                  <span className={`text-[11px] ${TOOL_COLORS[step.tool] || "text-muted-foreground"}`}>{step.tool}</span>
                  <span className="mono text-[11px] text-muted-foreground">{formatCost(step.cost)}</span>
                </div>
              ))}
            </div>

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
