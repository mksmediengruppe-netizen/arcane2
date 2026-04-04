// Design: Refined Dark SaaS — Keyboard Shortcuts Reference Modal (⌘/)
import { X } from "lucide-react";

interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  {
    category: "Навигация",
    items: [
      { keys: ["⌘", "D"], label: "Дашборды" },
      { keys: ["⌘", "P"], label: "Плейбуки" },
      { keys: ["⌘", "U"], label: "Пользователи" },
      { keys: ["⌘", "R"], label: "Расписание" },
      { keys: ["⌘", "G"], label: "Dog Racing" },
      { keys: ["⌘", ","], label: "Настройки" },
      { keys: ["Esc"], label: "Вернуться в чат" },
    ]
  },
  {
    category: "Интерфейс",
    items: [
      { keys: ["⌘", "K"], label: "Открыть палитру команд" },
      { keys: ["⌘", "/"], label: "Показать горячие клавиши" },
      { keys: ["⌘", "B"], label: "Свернуть/развернуть левую панель" },
      { keys: ["⌘", "⇧", "D"], label: "Переключить тему" },
      { keys: ["⌘", "["], label: "Свернуть/развернуть правую панель" },
    ]
  },
  {
    category: "Задачи и проекты",
    items: [
      { keys: ["⌘", "N"], label: "Новая задача в текущем проекте" },
      { keys: ["⌘", "⇧", "N"], label: "Новый проект" },
      { keys: ["⌘", "⇧", "C"], label: "Дублировать задачу" },
      { keys: ["F2"], label: "Переименовать выбранную задачу" },
      { keys: ["Del"], label: "Удалить выбранную задачу" },
    ]
  },
  {
    category: "Чат",
    items: [
      { keys: ["Enter"], label: "Отправить сообщение" },
      { keys: ["⇧", "Enter"], label: "Новая строка в сообщении" },
      { keys: ["⌘", "⇧", "S"], label: "Остановить генерацию" },
      { keys: ["↑"], label: "Редактировать последнее сообщение" },
    ]
  },
  {
    category: "Dog Racing",
    items: [
      { keys: ["⌘", "G"], label: "Открыть Dog Racing" },
      { keys: ["⌘", "Enter"], label: "Запустить гонку" },
      { keys: ["1", "-", "9"], label: "Выбрать количество моделей" },
    ]
  },
  {
    category: "Панель инспекции",
    items: [
      { keys: ["1"], label: "Live — живой статус" },
      { keys: ["2"], label: "Шаги выполнения" },
      { keys: ["3"], label: "Мышление модели" },
      { keys: ["4"], label: "Превью HTML" },
      { keys: ["5"], label: "Логи терминала" },
    ]
  },
];

export default function ShortcutsModal({ open, onClose }: ShortcutsModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[600px] mx-4 bg-popover border border-border rounded-xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
          <div>
            <div className="text-[14px] font-semibold text-foreground">Горячие клавиши</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Быстрый доступ ко всем функциям</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-5 grid grid-cols-2 gap-6">
          {SHORTCUTS.map(section => (
            <div key={section.category}>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                {section.category}
              </div>
              <div className="space-y-2">
                {section.items.map(item => (
                  <div key={item.label} className="flex items-center justify-between gap-4">
                    <span className="text-[12px] text-foreground/80">{item.label}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {item.keys.map((k, i) => (
                        <kbd key={i} className="px-1.5 py-0.5 text-[10px] bg-muted border border-border rounded font-mono text-muted-foreground">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex-shrink-0">
          <span className="text-[11px] text-muted-foreground">
            На Mac используйте <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[9px] font-mono">⌘</kbd>, на Windows/Linux — <kbd className="px-1 py-0.5 bg-muted border border-border rounded text-[9px] font-mono">Ctrl</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
