// Design: Refined Dark SaaS — Empty Chat State with Quick-Action Templates
import { Zap, Code2, Globe, FileText, Terminal, Brain, Search, Cpu } from "lucide-react";

interface EmptyChatProps {
  projectName: string;
  taskName: string;
  onSelectTemplate: (text: string) => void;
}

const QUICK_ACTIONS = [
  {
    icon: <Code2 size={15} />,
    label: "Написать код",
    description: "Создать скрипт, функцию или компонент",
    prompt: "Напиши мне ",
    color: "text-blue-400",
    bg: "bg-blue-400/10 hover:bg-blue-400/15",
  },
  {
    icon: <Globe size={15} />,
    label: "Веб-задача",
    description: "Настройка сервера, SSL, nginx, домен",
    prompt: "Настрой ",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 hover:bg-emerald-400/15",
  },
  {
    icon: <FileText size={15} />,
    label: "Написать текст",
    description: "Документация, README, описание",
    prompt: "Напиши документацию для ",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10 hover:bg-yellow-400/15",
  },
  {
    icon: <Terminal size={15} />,
    label: "Команды сервера",
    description: "SSH, bash, установка пакетов",
    prompt: "Выполни на сервере: ",
    color: "text-purple-400",
    bg: "bg-purple-400/10 hover:bg-purple-400/15",
  },
  {
    icon: <Search size={15} />,
    label: "Исследовать",
    description: "Найти информацию, сравнить варианты",
    prompt: "Исследуй и сравни ",
    color: "text-orange-400",
    bg: "bg-orange-400/10 hover:bg-orange-400/15",
  },
  {
    icon: <Brain size={15} />,
    label: "Анализ и план",
    description: "Составить план, проанализировать задачу",
    prompt: "Составь план для ",
    color: "text-pink-400",
    bg: "bg-pink-400/10 hover:bg-pink-400/15",
  },
];

const EXAMPLE_PROMPTS = [
  "Установи Bitrix на Ubuntu 22.04 с nginx и MySQL",
  "Настрой SSL сертификат Let's Encrypt для домена example.com",
  "Создай React компонент для отображения таблицы с пагинацией",
  "Оптимизируй скорость загрузки WordPress сайта",
  "Напиши bash скрипт для автоматического бэкапа базы данных",
  "Настрой мониторинг сервера с Grafana и Prometheus",
];

export default function EmptyChat({ projectName, taskName, onSelectTemplate }: EmptyChatProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-10 overflow-y-auto">
      {/* Icon + Title */}
      <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <Cpu size={18} className="text-primary" />
      </div>
      <div className="text-[15px] font-semibold text-foreground mb-1">{taskName}</div>
      <div className="text-[12px] text-muted-foreground mb-8">{projectName} · Готов к работе</div>

      {/* Quick action templates */}
      <div className="w-full max-w-[520px] mb-8">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Быстрый старт
        </div>
        <div className="grid grid-cols-2 gap-2">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.label}
              onClick={() => onSelectTemplate(action.prompt)}
              className={`flex items-start gap-3 p-3 rounded-lg border border-border ${action.bg} transition-all text-left group`}
            >
              <span className={`${action.color} flex-shrink-0 mt-0.5`}>{action.icon}</span>
              <div>
                <div className="text-[12px] font-medium text-foreground group-hover:text-foreground">{action.label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{action.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Example prompts */}
      <div className="w-full max-w-[520px]">
        <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Примеры запросов
        </div>
        <div className="space-y-1.5">
          {EXAMPLE_PROMPTS.map(prompt => (
            <button
              key={prompt}
              onClick={() => onSelectTemplate(prompt)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors text-left group"
            >
              <Zap size={11} className="text-muted-foreground/50 flex-shrink-0 group-hover:text-primary transition-colors" />
              <span className="text-[12px] text-muted-foreground group-hover:text-foreground transition-colors truncate">{prompt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
