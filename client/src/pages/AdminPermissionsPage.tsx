// AdminPermissionsPage — Visual permission matrix for all users
import { useState, useEffect } from "react";
import {
  ADMIN_USERS, ADMIN_GROUPS, MODELS,
  type AdminUser, type Permission, type TaskVisibility,
} from "@/lib/mockData";
import { api } from "@/lib/api";

const AVATAR_COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4"];

const VISIBILITY_LABELS: Record<TaskVisibility, string> = {
  own: "Свои", group: "Группа", all: "Все",
};
const VISIBILITY_COLORS: Record<TaskVisibility, string> = {
  own: "bg-slate-100 text-slate-600",
  group: "bg-blue-100 text-blue-700",
  all: "bg-purple-100 text-purple-700",
};

const SECTIONS: { key: keyof Permission; label: string; icon: string }[] = [
  { key: "canViewAnalytics",     label: "Аналитика",         icon: "📊" },
  { key: "canViewModels",        label: "Модели",             icon: "🤖" },
  { key: "canViewLogs",          label: "Логи",               icon: "📋" },
  { key: "canViewBudgets",       label: "Бюджет (просмотр)", icon: "👁" },
  { key: "canManageBudgets",     label: "Бюджет (управл.)",  icon: "⚙" },
  { key: "canViewConsolidation", label: "Консолидация",       icon: "🧠" },
  { key: "canViewDogRacing",     label: "Dog Racing",         icon: "🐕" },
  { key: "canViewAdminPanel",    label: "Админ-панель",       icon: "🔐" },
];

function Check({ ok }: { ok: boolean }) {
  return ok
    ? <span className="text-green-500 text-base">✓</span>
    : <span className="text-slate-200 text-base">✕</span>;
}

interface QuickEditProps {
  user: AdminUser;
  onClose: () => void;
  onSave: (u: AdminUser) => void;
  saving?: boolean;
}

function QuickEditPanel({ user, onClose, onSave, saving }: QuickEditProps) {
  const [perm, setPerm] = useState<Permission>({ ...user.permissions });
  const set = (patch: Partial<Permission>) => setPerm(p => ({ ...p, ...patch }));

  const allModels = perm.allowedModelIds === null;

  function toggleModel(id: string) {
    if (allModels) {
      set({ allowedModelIds: MODELS.map(m => m.id).filter(m => m !== id) });
    } else {
      const current = perm.allowedModelIds!;
      const next = current.includes(id) ? current.filter(m => m !== id) : [...current, id];
      set({ allowedModelIds: next.length === MODELS.length ? null : next });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: user.avatarColor }}>{user.avatarInitials}</div>
            <div>
              <div className="font-semibold text-slate-900 text-sm">{user.name}</div>
              <div className="text-xs text-slate-400">{user.email}</div>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">✕</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Task visibility */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Видимость задач</label>
            <div className="flex gap-2">
              {(["own", "group", "all"] as TaskVisibility[]).map(v => (
                <button key={v} onClick={() => set({ taskVisibility: v })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${perm.taskVisibility === v ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                  {VISIBILITY_LABELS[v]}
                </button>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Разделы</label>
            <div className="grid grid-cols-2 gap-2">
              {SECTIONS.map(s => (
                <label key={s.key} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 cursor-pointer">
                  <input type="checkbox" className="rounded" checked={!!perm[s.key]}
                    onChange={e => set({ [s.key]: e.target.checked } as Partial<Permission>)} />
                  <span className="text-base">{s.icon}</span>
                  <span className="text-xs text-slate-700">{s.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Models */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Доступные модели</label>
              <button onClick={() => set({ allowedModelIds: null })}
                className={`text-xs px-2 py-0.5 rounded ${allModels ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                Все
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {MODELS.map(m => {
                const allowed = allModels || (perm.allowedModelIds?.includes(m.id) ?? false);
                return (
                  <button key={m.id} onClick={() => toggleModel(m.id)}
                    className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${allowed ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-400 line-through"}`}>
                    {m.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Отмена</button>
          <button onClick={() => onSave({ ...user, permissions: perm })} disabled={saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-60">
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPermissionsPage() {
  const [users, setUsers] = useState<AdminUser[]>(ADMIN_USERS);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);

  // Load users from backend
  useEffect(() => {
    api.admin.users.list().then((data: any) => {
      const mapped: AdminUser[] = (data.users || data || []).map((u: any, idx: number) => ({
        id: u.id || `u${idx}`,
        name: u.name || u.email || "?",
        email: u.email || "",
        role: u.role || "user",
        status: (u.status === false || u.is_active === false) ? "blocked" : (u.status || "active"),
        spent: u.spent_usd || u.spent || 0,
        budget: null,
        groupId: u.group_id || u.groupId || null,
        avatarInitials: u.avatarInitials || (u.name || u.email || "?").slice(0, 2).toUpperCase(),
        avatarColor: u.avatarColor || AVATAR_COLORS[idx % AVATAR_COLORS.length],
        permissions: u.permissions || {
          taskVisibility: "own",
          canViewAnalytics: false, canViewModels: true, canViewLogs: false,
          canViewBudgets: false, canManageBudgets: false,
          canViewConsolidation: false, canViewDogRacing: false, canViewAdminPanel: false,
          allowedModelIds: null,
        },
        taskVisibility: u.task_visibility || u.taskVisibility || "own",
        createdAt: u.created_at || new Date().toISOString(),
        lastActiveAt: u.last_active || new Date().toISOString(),
      }));
      if (mapped.length > 0) setUsers(mapped);
    }).catch(() => {});
  }, []);

  function handleSave(u: AdminUser) {
    setSaving(true);
    const permPayload = {
      taskVisibility: u.permissions.taskVisibility,
      canViewAnalytics: u.permissions.canViewAnalytics,
      canViewModels: u.permissions.canViewModels,
      canViewLogs: u.permissions.canViewLogs,
    };
    api.admin.users.update(u.id, {
      name: u.name,
      email: u.email,
      role: u.role,
    } as any).then(() => {
      // Also save permissions via dedicated endpoint
      return fetch(`/api/admin/users/${u.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${localStorage.getItem("arcane2_token") || ""}` },
        body: JSON.stringify(permPayload),
      });
    }).then(() => {
      setUsers(prev => prev.map(x => x.id === u.id ? u : x));
    }).catch(() => {
      setUsers(prev => prev.map(x => x.id === u.id ? u : x));
    }).finally(() => {
      setSaving(false);
      setEditUser(null);
    });
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <h1 className="text-xl font-bold text-slate-900">Матрица прав доступа</h1>
        <p className="text-sm text-slate-500 mt-0.5">Обзор прав всех пользователей. Нажмите «Изменить» для редактирования.</p>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white rounded-2xl border border-slate-200 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-500 uppercase tracking-wide sticky left-0 bg-slate-50 z-10 min-w-[180px]">Пользователь</th>
                <th className="text-center px-3 py-3 font-semibold text-slate-500 uppercase tracking-wide min-w-[90px]">Задачи</th>
                {SECTIONS.map(s => (
                  <th key={s.key} className="text-center px-3 py-3 font-semibold text-slate-500 uppercase tracking-wide min-w-[80px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{s.icon}</span>
                      <span className="text-xs normal-case font-medium">{s.label}</span>
                    </div>
                  </th>
                ))}
                <th className="text-center px-3 py-3 font-semibold text-slate-500 uppercase tracking-wide min-w-[80px]">Модели</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 uppercase tracking-wide sticky right-0 bg-slate-50 z-10"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const group = ADMIN_GROUPS.find(g => g.id === u.groupId);
                const modelCount = u.permissions.allowedModelIds === null ? MODELS.length : u.permissions.allowedModelIds.length;
                return (
                  <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    {/* User */}
                    <td className="px-4 py-3 sticky left-0 bg-white hover:bg-slate-50 z-10">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: u.avatarColor }}>{u.avatarInitials}</div>
                        <div>
                          <div className="font-medium text-slate-800">{u.name}</div>
                          {group && <div className="text-slate-400">{group.name}</div>}
                        </div>
                      </div>
                    </td>
                    {/* Task visibility */}
                    <td className="px-3 py-3 text-center">
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${VISIBILITY_COLORS[u.permissions.taskVisibility]}`}>
                        {VISIBILITY_LABELS[u.permissions.taskVisibility]}
                      </span>
                    </td>
                    {/* Section checkmarks */}
                    {SECTIONS.map(s => (
                      <td key={s.key} className="px-3 py-3 text-center">
                        <Check ok={!!u.permissions[s.key]} />
                      </td>
                    ))}
                    {/* Models */}
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-medium ${modelCount === MODELS.length ? "text-green-600" : "text-amber-600"}`}>
                        {modelCount}/{MODELS.length}
                      </span>
                    </td>
                    {/* Edit */}
                    <td className="px-4 py-3 text-right sticky right-0 bg-white hover:bg-slate-50 z-10">
                      <button onClick={() => setEditUser(u)}
                        className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors">Изменить</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-4 flex items-center gap-6 text-xs text-slate-400">
          <div className="flex items-center gap-1.5"><span className="text-green-500">✓</span> Доступ разрешён</div>
          <div className="flex items-center gap-1.5"><span className="text-slate-300">✕</span> Доступ запрещён</div>
          <div className="flex items-center gap-1.5"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">Группа</span> Видит задачи группы</div>
          <div className="flex items-center gap-1.5"><span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Все</span> Видит все задачи</div>
        </div>
      </div>

      {editUser && (
        <QuickEditPanel user={editUser} onClose={() => setEditUser(null)} onSave={handleSave} saving={saving} />
      )}
    </div>
  );
}
