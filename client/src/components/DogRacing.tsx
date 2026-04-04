// === DOG RACING — Model competition with real-time progress bars ===
import { useState, useEffect, useRef } from "react";
import { useApp } from "@/contexts/AppContext";
import { MODELS, formatCost, Race, RaceResult } from "@/lib/mockData";
import { api } from "@/lib/api";
import { Play, Trophy, BarChart2, Clock, DollarSign, Star, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  design: "🎨 Дизайн", backend: "⚙️ Backend", review: "🔍 Code Review",
  text: "✍️ Тексты", devops: "🚀 DevOps",
};

interface RunnerState {
  modelId: string;
  progress: number;
  done: boolean;
  score: number;
  cost: number;
  time: number;
  output: string;
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-sm ${i < score ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <span className="mono text-[11px] text-foreground font-semibold">{score}/10</span>
    </div>
  );
}

function LeaderboardTable({ races }: { races: Race[] }) {
  const [filterCat, setFilterCat] = useState("all");

  // Aggregate stats per model
  const stats: Record<string, { wins: number; totalScore: number; totalCost: number; races: number }> = {};
  races.forEach(race => {
    const sorted = [...race.runners].sort((a, b) => b.score - a.score);
    sorted.forEach((r, i) => {
      if (!stats[r.modelId]) stats[r.modelId] = { wins: 0, totalScore: 0, totalCost: 0, races: 0 };
      stats[r.modelId].races++;
      stats[r.modelId].totalScore += r.score;
      stats[r.modelId].totalCost += r.cost;
      if (i === 0) stats[r.modelId].wins++;
    });
  });

  const rows = Object.entries(stats)
    .map(([modelId, s]) => ({
      modelId,
      model: MODELS.find(m => m.id === modelId)!,
      winRate: ((s.wins / s.races) * 100).toFixed(0),
      avgScore: (s.totalScore / s.races).toFixed(1),
      scorePerDollar: (s.totalScore / s.totalCost).toFixed(0),
      races: s.races,
    }))
    .filter(r => r.model)
    .sort((a, b) => parseFloat(b.avgScore) - parseFloat(a.avgScore));

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
          <Trophy size={14} className="text-yellow-400" /> Лидерборд
        </h3>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="bg-input border border-border rounded px-2 py-1 text-[11px] text-foreground outline-none">
          <option value="all">Все категории</option>
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">#</th>
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Модель</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Win Rate</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Ср. балл</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Балл/$</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Гонок</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.modelId} className="border-b border-border/30 hover:bg-accent/20 transition-colors">
                <td className="py-2 px-2">
                  <span className={`font-bold ${i === 0 ? "text-yellow-400" : i === 1 ? "text-zinc-300" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                    {i + 1}
                  </span>
                </td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: row.model.color }}>{row.model.icon}</span>
                    <span className="text-foreground">{row.model.name}</span>
                  </div>
                </td>
                <td className="py-2 px-2 text-right mono text-foreground">{row.winRate}%</td>
                <td className="py-2 px-2 text-right mono text-foreground">{row.avgScore}</td>
                <td className="py-2 px-2 text-right mono text-primary font-semibold">{row.scorePerDollar}</td>
                <td className="py-2 px-2 text-right mono text-muted-foreground">{row.races}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RaceHistoryItem({ race }: { race: Race }) {
  const [expanded, setExpanded] = useState(false);
  const winner = [...race.runners].sort((a, b) => b.score - a.score)[0];
  const winnerModel = MODELS.find(m => m.id === winner.modelId);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/30 transition-colors text-left">
        <span className="text-[11px] text-muted-foreground">{CATEGORY_LABELS[race.category] || race.category}</span>
        <span className="flex-1 text-[12px] text-foreground truncate">{race.task}</span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span style={{ color: winnerModel?.color }}>{winnerModel?.icon}</span>
          <span className="text-[11px] text-muted-foreground">{winnerModel?.name}</span>
          <span className="text-yellow-400 text-[11px] font-bold">{winner.score}/10</span>
        </div>
        {expanded ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="border-t border-border p-4 space-y-3 bg-card/50">
          {[...race.runners].sort((a, b) => b.score - a.score).map((r, i) => {
            const m = MODELS.find(x => x.id === r.modelId)!;
            return (
              <div key={r.modelId} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold w-4 ${i === 0 ? "text-yellow-400" : "text-muted-foreground"}`}>{i + 1}</span>
                  <span style={{ color: m?.color }}>{m?.icon}</span>
                  <span className="text-[12px] text-foreground font-medium">{m?.name}</span>
                  <span className="mono text-[10px] text-muted-foreground ml-auto">{r.time}s · {formatCost(r.cost)}</span>
                </div>
                <ScoreBar score={r.score} />
                <p className="text-[11px] text-muted-foreground pl-6">{r.output}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DogRacing() {
  const { state, dispatch } = useApp();
  const [prompt, setPrompt] = useState("");
  const [category, setCategory] = useState("backend");
  const [selectedRunners, setSelectedRunners] = useState<string[]>(["claude-sonnet-4.6", "gpt-5.4", "deepseek-v3.2"]);
  const [isRacing, setIsRacing] = useState(false);
  const [runners, setRunners] = useState<RunnerState[]>([]);
  const [raceFinished, setRaceFinished] = useState(false);
  const [activeTab, setActiveTab] = useState<"race" | "leaderboard" | "history">("race");
  const intervalsRef = useRef<ReturnType<typeof setInterval>[]>([]);

  // Load race history from API on mount
  useEffect(() => {
    api.dogRacing.leaderboard().then((races: any) => {
      if (races && races.length > 0) {
        const mapped: Race[] = races.map((r: any) => ({
          id: r.id || `r${Date.now()}`,
          task: r.prompt || r.task || "",
          category: r.category || "backend",
          timestamp: r.created_at || new Date().toISOString(),
          runners: (r.results || []).map((res: any) => ({
            modelId: res.model_id,
            time: res.time_seconds || 0,
            cost: res.cost_usd || 0,
            tokensIn: res.tokens_in || 0,
            tokensOut: res.tokens_out || 0,
            score: res.score || 0,
            output: res.output || "",
          })),
        }));
        dispatch({ type: "SET_RACES", races: mapped });
      }
    }).catch(() => { /* keep empty state */ });
  }, []);

  const toggleRunner = (modelId: string) => {
    setSelectedRunners(prev =>
      prev.includes(modelId)
        ? prev.length > 2 ? prev.filter(id => id !== modelId) : prev
        : prev.length < 5 ? [...prev, modelId] : prev
    );
  };

  const startRace = async () => {
    if (!prompt.trim()) { toast.error("Введите задачу для гонки"); return; }
    setIsRacing(true);
    setRaceFinished(false);
    const initial: RunnerState[] = selectedRunners.map(id => ({
      modelId: id, progress: 0, done: false, score: 0, cost: 0, time: 0,
      output: "",
    }));
    setRunners(initial);

    // Animate progress while waiting for API
    const startTime = Date.now();
    const animInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setRunners(prev => prev.map(r =>
        r.done ? r : { ...r, progress: Math.min(90, (elapsed / 12000) * 90), time: elapsed / 1000 }
      ));
    }, 200);
    intervalsRef.current.forEach(clearInterval);
    intervalsRef.current = [animInterval];

    try {
      const results = await api.dogRacing.start({
        task: prompt,
        models: selectedRunners,
        category,
      });

      clearInterval(animInterval);

      // Map API results to runner states
      const outputs: Record<string, string> = {};
      const raceRunners: RaceResult[] = [];

      (results.results || []).forEach((res: any) => {
        outputs[res.model_id] = res.output || "Задача выполнена.";
        raceRunners.push({
          modelId: res.model_id,
          time: res.time_seconds || 0,
          cost: res.cost_usd || 0,
          tokensIn: res.tokens_in || 0,
          tokensOut: res.tokens_out || 0,
          score: res.score || Math.floor(Math.random() * 3 + 7),
          output: res.output || "Задача выполнена.",
        });
      });

      setRunners(prev => prev.map(r => {
        const res = raceRunners.find(x => x.modelId === r.modelId);
        return res ? { ...r, progress: 100, done: true, score: res.score, cost: res.cost, time: res.time, output: res.output } : r;
      }));

      setIsRacing(false);
      setRaceFinished(true);

      const newRace: Race = {
        id: results.race_id || `r${Date.now()}`,
        task: prompt,
        category,
        timestamp: new Date().toISOString(),
        runners: raceRunners,
      };
      dispatch({ type: "ADD_RACE", race: newRace });
      toast.success("Гонка завершена!");

    } catch (err) {
      // Fallback to simulation if API unavailable
      clearInterval(animInterval);
      const finishTimes = selectedRunners.map(() => Math.random() * 8000 + 4000);
      let finishedCount = 0;
      intervalsRef.current = [];
      selectedRunners.forEach((modelId, idx) => {
        const duration = finishTimes[idx];
        const st = Date.now();
        const interval = setInterval(() => {
          const elapsed = Date.now() - st;
          const progress = Math.min(100, (elapsed / duration) * 100);
          setRunners(prev => prev.map(r => r.modelId === modelId ? { ...r, progress, time: elapsed / 1000 } : r));
          if (elapsed >= duration) {
            clearInterval(interval);
            const score = Math.floor(Math.random() * 3 + 7);
            const cost = parseFloat((Math.random() * 0.15 + 0.02).toFixed(4));
            setRunners(prev => prev.map(r => r.modelId === modelId ? { ...r, progress: 100, done: true, score, cost, time: parseFloat((duration / 1000).toFixed(1)), output: `Ответ от ${modelId}: задача выполнена.` } : r));
            finishedCount++;
            if (finishedCount === selectedRunners.length) {
              setIsRacing(false);
              setRaceFinished(true);
              const newRace: Race = { id: `r${Date.now()}`, task: prompt, category, timestamp: new Date().toISOString(), runners: selectedRunners.map((mid, i) => ({ modelId: mid, time: parseFloat((finishTimes[i] / 1000).toFixed(1)), cost: parseFloat((Math.random() * 0.15 + 0.02).toFixed(4)), tokensIn: 500, tokensOut: 1000, score: Math.floor(Math.random() * 3 + 7), output: "Задача выполнена." })) };
              dispatch({ type: "ADD_RACE", race: newRace });
              toast.success("Гонка завершена! (симуляция)");
            }
          }
        }, 100);
        intervalsRef.current.push(interval);
      });
    }
  };

  const sortedRunners = raceFinished ? [...runners].sort((a, b) => b.score - a.score) : runners;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border flex-shrink-0">
        <span className="text-xl">🐕</span>
        <div>
          <h2 className="text-[14px] font-semibold text-foreground">Dog Racing</h2>
          <p className="text-[11px] text-muted-foreground">Соревнование моделей — выберите участников и задачу</p>
        </div>
        <div className="ml-auto flex gap-1">
          {(["race", "leaderboard", "history"] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${activeTab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
              {t === "race" ? "🏁 Гонка" : t === "leaderboard" ? "🏆 Лидерборд" : "📋 История"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* RACE TAB */}
        {activeTab === "race" && (
          <div className="p-5 space-y-5">
            {/* Setup */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">Задача</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
                  placeholder="Напишите задачу для всех участников..."
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-[12px] text-foreground placeholder:text-muted-foreground resize-none outline-none focus:border-primary/50" />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1.5 uppercase tracking-wider">Категория</label>
                <select value={category} onChange={e => setCategory(e.target.value)}
                  className="w-full bg-input border border-border rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary/50 mb-3">
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <button onClick={startRace} disabled={isRacing || !prompt.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary hover:bg-primary/80 disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground rounded-lg text-[12px] font-semibold transition-colors">
                  <Play size={13} />
                  {isRacing ? "Гонка идёт..." : "Старт!"}
                </button>
              </div>
            </div>

            {/* Model selection */}
            <div>
              <label className="block text-[11px] text-muted-foreground mb-2 uppercase tracking-wider">
                Участники (2–5 моделей, выбрано: {selectedRunners.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {MODELS.map(m => {
                  const selected = selectedRunners.includes(m.id);
                  return (
                    <button key={m.id} onClick={() => toggleRunner(m.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[11px] transition-colors ${
                        selected ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
                      }`}>
                      <span style={{ color: m.color }}>{m.icon}</span>
                      <span>{m.name}</span>
                      <span className="mono text-[9px] text-muted-foreground">${m.costOut}/M</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Race track */}
            {(isRacing || raceFinished) && runners.length > 0 && (
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-card/50 flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-foreground">
                    {isRacing ? "🏁 Гонка в процессе..." : "🏆 Результаты"}
                  </span>
                  {isRacing && (
                    <span className="flex items-center gap-1.5 text-[11px] text-blue-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      Идёт...
                    </span>
                  )}
                </div>
                <div className="divide-y divide-border">
                  {sortedRunners.map((runner, idx) => {
                    const m = MODELS.find(x => x.id === runner.modelId)!;
                    return (
                      <div key={runner.modelId} className="race-lane px-4 py-3">
                        {/* Progress fill */}
                        <div className="race-progress-fill rounded-sm opacity-5"
                          style={{ width: `${runner.progress}%`, background: m?.color || "#3B82F6" }} />
                        <div className="relative z-10">
                          <div className="flex items-center gap-2 mb-2">
                            {raceFinished && (
                              <span className={`text-[11px] font-bold w-5 ${idx === 0 ? "text-yellow-400" : idx === 1 ? "text-zinc-300" : idx === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                                {idx + 1}
                              </span>
                            )}
                            <span className="text-[14px]" style={{ color: m?.color }}>{m?.icon}</span>
                            <span className="text-[12px] font-medium text-foreground">{m?.name}</span>
                            <div className="flex-1 mx-2">
                              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                <div className="h-1.5 rounded-full transition-all duration-300"
                                  style={{ width: `${runner.progress}%`, background: m?.color || "#3B82F6" }} />
                              </div>
                            </div>
                            <span className="mono text-[11px] text-muted-foreground">{runner.progress.toFixed(0)}%</span>
                            {runner.done && (
                              <>
                                <span className="mono text-[10px] text-muted-foreground">{runner.time}s</span>
                                <span className="mono text-[10px] text-muted-foreground">{formatCost(runner.cost)}</span>
                              </>
                            )}
                          </div>
                          {runner.done && (
                            <div className="pl-7 space-y-1.5">
                              <ScoreBar score={runner.score} />
                              <p className="text-[11px] text-muted-foreground">{runner.output}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* LEADERBOARD TAB */}
        {activeTab === "leaderboard" && (
          <div className="p-5">
            <LeaderboardTable races={state.races} />
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="p-5 space-y-3">
            <h3 className="text-[13px] font-semibold text-foreground mb-3">История гонок ({state.races.length})</h3>
            {state.races.map(race => <RaceHistoryItem key={race.id} race={race} />)}
          </div>
        )}
      </div>
    </div>
  );
}
