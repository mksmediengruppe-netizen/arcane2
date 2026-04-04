// === PLAYBOOKS & SCHEDULE ===
import { useState, useMemo } from "react";
import { BookOpen, Plus, Play, Clock, Calendar, ChevronRight, Trash2, Search, Copy } from "lucide-react";
import { toast } from "sonner";
import { MODELS } from "@/lib/mockData";

const MOCK_PLAYBOOKS = [
  { id: "pb1", name: "Аудит безопасности сервера", category: "devops", model: "claude-sonnet-4.6", prompt: "Проведи полный аудит безопасности сервера: проверь открытые порты, конфигурацию nginx, права файлов, обновления системы. Составь отчёт с приоритизированными рекомендациями.", runs: 12, avgCost: 0.89 },
  { id: "pb2", name: "Code Review Python", category: "review", model: "claude-opus-4.6", prompt: "Проведи code review предоставленного Python кода. Найди уязвимости, нарушения PEP8, возможности оптимизации. Оцени покрытие тестами.", runs: 8, avgCost: 1.24 },
  { id: "pb3", name: "Генерация SEO-текстов", category: "text", model: "gpt-5.4", prompt: "Напиши SEO-оптимизированный текст для страницы. Включи ключевые слова, мета-описание, заголовки H1-H3. Объём 1500-2000 слов.", runs: 25, avgCost: 0.34 },
  { id: "pb4", name: "Настройка CI/CD", category: "devops", model: "deepseek-v3.2", prompt: "Настрой GitHub Actions для автоматического деплоя. Включи: тесты, линтер, сборку Docker образа, деплой на сервер.", runs: 5, avgCost: 0.45 },
  { id: "pb5", name: "Анализ производительности API", category: "backend", model: "deepseek-v3.2", prompt: "Проанализируй производительность API: найди медленные эндпоинты, предложи оптимизацию запросов, кэширование.", runs: 3, avgCost: 0.28 },
  { id: "pb6", name: "Документация проекта", category: "text", model: "claude-sonnet-4.6", prompt: "Сгенерируй README.md для проекта: описание, установка, примеры использования, API документация.", runs: 18, avgCost: 0.56 },
];

const MOCK_SCHEDULE = [
  { id: "s1", name: "Ежедневный бэкап БД", playbook: "Аудит безопасности", cron: "0 3 * * *", nextRun: "Завтра 03:00", status: "active" },
  { id: "s2", name: "Еженедельный code review", playbook: "Code Review Python", cron: "0 10 * * 1", nextRun: "Пн 10:00", status: "active" },
  { id: "s3", name: "Генерация контента", playbook: "SEO-тексты", cron: "0 9 * * 1,3,5", nextRun: "Пт 09:00", status: "paused" },
];

const CATEGORY_LABELS: Record<string, string> = {
  devops: "🚀 DevOps", review: "🔍 Review", text: "✍️ Тексты", backend: "⚙️ Backend", design: "🎨 Дизайн",
};

export function PlaybooksView() {
  const [playbooks, setPlaybooks] = useState(MOCK_PLAYBOOKS);
  const [showNew, setShowNew] = useState(false);
  const [newPb, setNewPb] = useState({ name: "", category: "backend", model: "claude-sonnet-4.6", prompt: "" });
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  const filtered = useMemo(() => playbooks.filter(pb => {
    const matchSearch = pb.name.toLowerCase().includes(search.toLowerCase()) || pb.prompt.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || pb.category === filterCat;
    return matchSearch && matchCat;
  }), [playbooks, search, filterCat]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
            <BookOpen size={15} /> Плейбуки
          </h2>
          <p className="text-[12px] text-muted-foreground">Шаблоны задач для повторного использования</p>
        </div>
        <button onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg text-[12px] transition-colors">
          <Plus size={12} /> Новый плейбук
        </button>
      </div>

      {/* Search and filter bar */}
      <div className="px-6 py-2.5 border-b border-border flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск плейбуков..."
            className="w-full pl-7 pr-3 py-1.5 bg-input border border-border rounded-lg text-[12px] text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50" />
        </div>
        <div className="flex gap-1.5">
          {[{ id: "all", label: "Все" }, ...Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ id: k, label: v }))].map(c => (
            <button key={c.id} onClick={() => setFilterCat(c.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-colors ${filterCat === c.id ? "bg-primary text-primary-foreground" : "bg-accent/50 hover:bg-accent text-muted-foreground hover:text-foreground"}`}>
              {c.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-muted-foreground ml-auto">{filtered.length} плейбуков</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {showNew && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-[12px] font-semibold text-foreground">Новый плейбук</h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="Название" value={newPb.name} onChange={e => setNewPb(p => ({ ...p, name: e.target.value }))}
                className="bg-input border border-border rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary/50" />
              <select value={newPb.category} onChange={e => setNewPb(p => ({ ...p, category: e.target.value }))}
                className="bg-input border border-border rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary/50">
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={newPb.model} onChange={e => setNewPb(p => ({ ...p, model: e.target.value }))}
                className="bg-input border border-border rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary/50 col-span-2">
                {MODELS.map(m => <option key={m.id} value={m.id}>{m.name} — ${m.costOut}/M out</option>)}
              </select>
              <textarea placeholder="Промпт шаблона..." value={newPb.prompt} onChange={e => setNewPb(p => ({ ...p, prompt: e.target.value }))}
                rows={3} className="bg-input border border-border rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary/50 resize-none col-span-2" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => {
                if (!newPb.name || !newPb.prompt) { toast.error("Заполните название и промпт"); return; }
                setPlaybooks(prev => [...prev, { id: `pb${Date.now()}`, ...newPb, runs: 0, avgCost: 0 }]);
                setShowNew(false);
                toast.success("Плейбук создан");
              }} className="px-3 py-1.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg text-[12px] transition-colors">
                Создать
              </button>
              <button onClick={() => setShowNew(false)} className="px-3 py-1.5 bg-accent text-foreground rounded-lg text-[12px] transition-colors">Отмена</button>
            </div>
          </div>
        )}

        {filtered.map(pb => {
          const model = MODELS.find(m => m.id === pb.model);
          return (
            <div key={pb.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] text-muted-foreground">{CATEGORY_LABELS[pb.category]}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="text-[11px]" style={{ color: model?.color }}>{model?.icon} {model?.name}</span>
                  </div>
                  <h3 className="text-[13px] font-medium text-foreground mb-1.5">{pb.name}</h3>
                  <p className="text-[11px] text-muted-foreground line-clamp-2">{pb.prompt}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted-foreground">Запусков: {pb.runs}</span>
                    <span className="mono text-[10px] text-muted-foreground">Ср. стоимость: ${pb.avgCost.toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => { navigator.clipboard.writeText(pb.prompt); toast.success("Промпт скопирован"); }}
                    className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" title="Копировать промпт">
                    <Copy size={11} />
                  </button>
                  <button onClick={() => toast.success(`Плейбук "${pb.name}" запущен`)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-[11px] transition-colors">
                    <Play size={11} /> Запустить
                  </button>
                  <button onClick={() => { setPlaybooks(prev => prev.filter(p => p.id !== pb.id)); toast.success("Удалён"); }}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ScheduleView() {
  const [schedules, setSchedules] = useState(MOCK_SCHEDULE);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
            <Calendar size={15} /> Расписание
          </h2>
          <p className="text-[12px] text-muted-foreground">Автоматические запуски задач по расписанию</p>
        </div>
        <button onClick={() => toast.info("Создание расписания")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg text-[12px] transition-colors">
          <Plus size={12} /> Новое расписание
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-3">
        {schedules.map(s => (
          <div key={s.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="text-[13px] font-medium text-foreground">{s.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    s.status === "active" ? "bg-emerald-400/10 text-emerald-400" : "bg-zinc-600/10 text-zinc-400"
                  }`}>
                    {s.status === "active" ? "Активно" : "Пауза"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><BookOpen size={10} /> {s.playbook}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> <code className="mono">{s.cron}</code></span>
                  <span className="flex items-center gap-1"><ChevronRight size={10} /> Следующий: {s.nextRun}</span>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button onClick={() => setSchedules(prev => prev.map(sc => sc.id === s.id ? { ...sc, status: sc.status === "active" ? "paused" : "active" } : sc))}
                  className="px-2.5 py-1.5 bg-accent hover:bg-accent/80 text-foreground rounded-md text-[11px] transition-colors">
                  {s.status === "active" ? "Пауза" : "Запустить"}
                </button>
                <button onClick={() => { setSchedules(prev => prev.filter(sc => sc.id !== s.id)); toast.success("Удалено"); }}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
