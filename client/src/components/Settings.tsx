// === SETTINGS — API Keys, Model defaults, User management ===
import { useState } from "react";
import { MOCK_USERS } from "@/lib/mockData";
import { Eye, EyeOff, Save, Plus, Trash2, Shield, User, UserCheck, Key, Settings2, Bell } from "lucide-react";
import { toast } from "sonner";

type SettingsTab = "api" | "models" | "users" | "notifications" | "general";

const ROLE_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  super_admin: { label: "Супер-админ", color: "text-yellow-400", icon: <Shield size={11} /> },
  manager:     { label: "Менеджер",    color: "text-blue-400",   icon: <UserCheck size={11} /> },
  user:        { label: "Пользователь",color: "text-muted-foreground", icon: <User size={11} /> },
};

function ApiKeysSection() {
  const [showOpenRouter, setShowOpenRouter] = useState(false);
  const [showManus, setShowManus] = useState(false);
  const [showTavily, setShowTavily] = useState(false);
  const [openRouterKey, setOpenRouterKey] = useState("sk-or-v1-••••••••••••••••••••••••••••••••");
  const [manusKey, setManusKey] = useState("mns-••••••••••••••••••••••••••••••••");
  const [tavilyKey, setTavilyKey] = useState("tvly-••••••••••••••••••••••••••••••••");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield size={14} className="text-yellow-400" />
        <span className="text-[12px] text-yellow-400 font-medium">Только для Супер-администратора</span>
      </div>

      {[
        { label: "OpenRouter API Key", value: openRouterKey, setter: setOpenRouterKey, show: showOpenRouter, toggle: () => setShowOpenRouter(v => !v), desc: "Доступ ко всем LLM-моделям через OpenRouter" },
        { label: "Manus API Key", value: manusKey, setter: setManusKey, show: showManus, toggle: () => setShowManus(v => !v), desc: "Интеграция с платформой Manus" },
        { label: "Tavily Search API Key", value: tavilyKey, setter: setTavilyKey, show: showTavily, toggle: () => setShowTavily(v => !v), desc: "Поиск в интернете для агентов" },
      ].map(field => (
        <div key={field.label} className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-1">
            <label className="text-[12px] font-medium text-foreground">{field.label}</label>
          </div>
          <div className="text-[11px] text-muted-foreground mb-3">{field.desc}</div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input type={field.show ? "text" : "password"} value={field.value}
                onChange={e => field.setter(e.target.value)}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-[12px] font-mono text-foreground outline-none focus:border-primary/50 pr-10" />
              <button onClick={field.toggle}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors">
                {field.show ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <button onClick={() => toast.success(`${field.label} сохранён`)}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg text-[12px] transition-colors">
              <Save size={12} /> Сохранить
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function UsersSection() {
  const [users, setUsers] = useState(MOCK_USERS);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "user", budget: "20" });

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) { toast.error("Заполните имя и email"); return; }
    setUsers(prev => [...prev, {
      id: `u${Date.now()}`, ...newUser, status: "active",
      budget: parseFloat(newUser.budget) || null, spent: 0,
    }]);
    setNewUser({ name: "", email: "", role: "user", budget: "20" });
    setShowAddUser(false);
    toast.success("Пользователь добавлен");
  };

  const toggleBlock = (id: string) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: u.status === "active" ? "blocked" : "active" } : u));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[13px] font-semibold text-foreground">Пользователи ({users.length})</h3>
        <button onClick={() => setShowAddUser(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg text-[12px] transition-colors">
          <Plus size={12} /> Добавить
        </button>
      </div>

      {showAddUser && (
        <div className="bg-card border border-border rounded-xl p-4 mb-4 space-y-3">
          <h4 className="text-[12px] font-medium text-foreground">Новый пользователь</h4>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Имя" value={newUser.name} onChange={e => setNewUser(p => ({ ...p, name: e.target.value }))}
              className="bg-input border border-border rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary/50" />
            <input placeholder="Email" value={newUser.email} onChange={e => setNewUser(p => ({ ...p, email: e.target.value }))}
              className="bg-input border border-border rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary/50" />
            <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
              className="bg-input border border-border rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary/50">
              <option value="user">Пользователь</option>
              <option value="manager">Менеджер</option>
              <option value="super_admin">Супер-админ</option>
            </select>
            <input placeholder="Бюджет $" value={newUser.budget} onChange={e => setNewUser(p => ({ ...p, budget: e.target.value }))}
              className="bg-input border border-border rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary/50" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddUser}
              className="px-3 py-1.5 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg text-[12px] transition-colors">
              Создать
            </button>
            <button onClick={() => setShowAddUser(false)}
              className="px-3 py-1.5 bg-accent hover:bg-accent/80 text-foreground rounded-lg text-[12px] transition-colors">
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Пользователь</th>
              <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Роль</th>
              <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Бюджет</th>
              <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Потрачено</th>
              <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Статус</th>
              <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Действия</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const role = ROLE_LABELS[user.role];
              const budgetPct = user.budget ? (user.spent / user.budget) * 100 : 0;
              return (
                <tr key={user.id} className="border-b border-border/30 hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                        {user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-foreground font-medium">{user.name}</div>
                        <div className="text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 ${role?.color}`}>
                      {role?.icon} {role?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {user.budget ? (
                      <div>
                        <div className="mono text-foreground">${user.budget}</div>
                        <div className="w-16 bg-muted rounded-full h-1 mt-1 ml-auto">
                          <div className={`h-1 rounded-full ${budgetPct > 80 ? "bg-yellow-400" : "bg-primary"}`}
                            style={{ width: `${Math.min(100, budgetPct)}%` }} />
                        </div>
                      </div>
                    ) : <span className="text-muted-foreground">∞</span>}
                  </td>
                  <td className="px-4 py-3 text-right mono text-foreground">${user.spent.toFixed(1)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      user.status === "active" ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
                    }`}>
                      {user.status === "active" ? "Активен" : "Заблокирован"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => toggleBlock(user.id)}
                        className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors text-[10px]">
                        {user.status === "active" ? "Блок" : "Разблок"}
                      </button>
                      <button onClick={() => { setUsers(prev => prev.filter(u => u.id !== user.id)); toast.success("Удалён"); }}
                        className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Settings() {
  const [tab, setTab] = useState<SettingsTab>("api");

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "api",           label: "API Ключи",     icon: <Key size={13} /> },
    { id: "users",         label: "Пользователи",  icon: <User size={13} /> },
    { id: "models",        label: "Модели",        icon: <Settings2 size={13} /> },
    { id: "notifications", label: "Уведомления",   icon: <Bell size={13} /> },
    { id: "general",       label: "Общие",         icon: <Settings2 size={13} /> },
  ];

  return (
    <div className="flex h-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-48 border-r border-border flex-shrink-0 py-4">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[12px] transition-colors ${
              tab === t.id ? "text-primary bg-primary/5 border-r-2 border-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {tab === "api" && (
          <div>
            <h2 className="text-[15px] font-semibold text-foreground mb-1">API Ключи</h2>
            <p className="text-[12px] text-muted-foreground mb-5">Управление ключами доступа к внешним сервисам</p>
            <ApiKeysSection />
          </div>
        )}
        {tab === "users" && (
          <div>
            <h2 className="text-[15px] font-semibold text-foreground mb-1">Пользователи</h2>
            <p className="text-[12px] text-muted-foreground mb-5">Управление доступом и бюджетами</p>
            <UsersSection />
          </div>
        )}
        {tab === "models" && (
          <div>
            <h2 className="text-[15px] font-semibold text-foreground mb-1">Настройки моделей</h2>
            <p className="text-[12px] text-muted-foreground mb-5">Параметры по умолчанию для LLM</p>
            <div className="space-y-3">
              {[
                { label: "Модель по умолчанию", desc: "Используется при создании новой задачи", value: "claude-sonnet-4.6", placeholder: "Например: claude-sonnet-4.6" },
                { label: "Температура", desc: "Случайность генерации (0 = детерминировано, 1 = творчески)", value: "0.7", placeholder: "0.0 – 1.0" },
                { label: "Максимум токенов", desc: "Лимит на один ответ", value: "8192", placeholder: "Например: 8192" },
                { label: "Бюджет на задачу по умолчанию ($)", desc: "Автостоп при достижении лимита", value: "5.00", placeholder: "Например: 5.00" },
              ].map(item => (
                <div key={item.label} className="bg-card border border-border rounded-xl p-4">
                  <div className="text-[12px] font-medium text-foreground mb-0.5">{item.label}</div>
                  <div className="text-[11px] text-muted-foreground mb-2">{item.desc}</div>
                  <input defaultValue={item.value} placeholder={item.placeholder}
                    className="bg-input border border-border rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary/50 w-full max-w-xs" />
                </div>
              ))}
              <button onClick={() => toast.success("Настройки сохранены")}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg text-[12px] transition-colors">
                <Save size={12} /> Сохранить
              </button>
            </div>
          </div>
        )}
        {tab === "notifications" && (
          <div>
            <h2 className="text-[15px] font-semibold text-foreground mb-1">Уведомления</h2>
            <p className="text-[12px] text-muted-foreground mb-5">Настройка оповещений о событиях</p>
            <div className="space-y-3">
              {[
                { label: "Задача завершена", desc: "Уведомлять при успешном завершении" },
                { label: "Ошибка выполнения", desc: "Уведомлять при ошибке агента" },
                { label: "80% бюджета задачи", desc: "Предупреждение о приближении к лимиту" },
                { label: "100% бюджета", desc: "Автостоп и уведомление" },
                { label: "Новый пользователь", desc: "Уведомлять при регистрации" },
              ].map(item => (
                <div key={item.label} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="text-[12px] font-medium text-foreground">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-9 h-5 bg-muted rounded-full peer peer-checked:bg-primary transition-colors" />
                    <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "general" && (
          <div>
            <h2 className="text-[15px] font-semibold text-foreground mb-1">Общие настройки</h2>
            <p className="text-[12px] text-muted-foreground mb-5">Основные параметры системы</p>
            <div className="space-y-3">
              {[
                { label: "Название системы", value: "Arcane 2" },
                { label: "Часовой пояс", value: "Europe/Moscow" },
                { label: "Валюта", value: "USD" },
              ].map(item => (
                <div key={item.label} className="bg-card border border-border rounded-xl p-4">
                  <label className="text-[12px] font-medium text-foreground block mb-2">{item.label}</label>
                  <input defaultValue={item.value}
                    className="bg-input border border-border rounded-lg px-3 py-2 text-[12px] text-foreground outline-none focus:border-primary/50 w-full max-w-xs" />
                </div>
              ))}
              <button onClick={() => toast.success("Настройки сохранены")}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/80 text-primary-foreground rounded-lg text-[12px] transition-colors">
                <Save size={12} /> Сохранить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
