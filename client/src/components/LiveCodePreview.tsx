// === LIVE CODE PREVIEW ===
// Mini floating card with live streaming code during agent execution.
// On hover: expands as a portal overlay on the right side of the screen.
// Design: Refined Dark SaaS — terminal aesthetic, syntax highlighting, smooth transitions.

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, FileCode, Terminal, FileText } from "lucide-react";

// ── Code sequences to stream ──────────────────────────────────────────────────
const CODE_SEQUENCES = [
  { file: "install.sh", lang: "bash", lines: [
    "#!/bin/bash",
    "set -e",
    "",
    "echo '→ Updating system...'",
    "apt update && apt upgrade -y",
    "",
    "echo '→ Installing nginx + PHP 8.1...'",
    "apt install -y nginx php8.1-fpm \\",
    "  php8.1-mysql php8.1-curl \\",
    "  php8.1-gd php8.1-mbstring",
    "",
    "echo '→ Configuring MySQL 8.0...'",
    "mysql_secure_installation",
    "mysql -u root -p -e \\",
    "  \"CREATE DATABASE bitrix\"",
    "  \"  CHARACTER SET utf8mb4;\"",
    "",
    "systemctl enable nginx php8.1-fpm",
    "systemctl start nginx php8.1-fpm",
    "echo '✓ Done!'",
  ]},
  { file: "nginx.conf", lang: "nginx", lines: [
    "server {",
    "    listen 80;",
    "    server_name example.com;",
    "    root /var/www/bitrix;",
    "",
    "    location / {",
    "        try_files $uri $uri/ =404;",
    "    }",
    "",
    "    location ~ \\.php$ {",
    "        fastcgi_pass unix:/run/php/php8.1-fpm.sock;",
    "        fastcgi_param SCRIPT_FILENAME",
    "            $document_root$fastcgi_script_name;",
    "        include fastcgi_params;",
    "    }",
    "}",
  ]},
  { file: "bot.py", lang: "python", lines: [
    "import asyncio",
    "from telegram import Update",
    "from telegram.ext import (",
    "    Application, CommandHandler,",
    "    MessageHandler, filters",
    ")",
    "from langchain.chains import RetrievalQA",
    "",
    "async def handle_message(",
    "    update: Update, ctx",
    ") -> None:",
    "    query = update.message.text",
    "    result = await qa_chain.ainvoke(",
    "        {\"query\": query}",
    "    )",
    "    await update.message.reply_text(",
    "        result[\"result\"]",
    "    )",
    "",
    "def main():",
    "    app = Application.builder()",
    "        .token(TOKEN).build()",
    "    app.run_polling()",
  ]},
  { file: "Dockerfile", lang: "docker", lines: [
    "FROM ubuntu:22.04",
    "",
    "RUN apt-get update && \\",
    "    apt-get install -y \\",
    "    nginx php8.1-fpm \\",
    "    php8.1-mysql curl",
    "",
    "COPY nginx.conf /etc/nginx/",
    "COPY . /var/www/html/",
    "",
    "RUN chown -R www-data:www-data \\",
    "    /var/www/html",
    "",
    "EXPOSE 80 443",
    "",
    "CMD [\"nginx\", \"-g\", \"daemon off;\"]",
  ]},
];

const LANG_COLORS: Record<string, string> = {
  nginx:   "#68d391",
  bash:    "#f6ad55",
  python:  "#76e4f7",
  docker:  "#63b3ed",
  default: "#a78bfa",
};

function getFileIcon(filename: string) {
  if (filename.endsWith(".sh"))  return <Terminal size={10} />;
  if (filename.endsWith(".py"))  return <FileCode size={10} />;
  if (filename === "Dockerfile") return <FileCode size={10} />;
  return <FileText size={10} />;
}

// ── Simple syntax highlighter ─────────────────────────────────────────────────
function HighlightedLine({ line, lang }: { line: string; lang: string }) {
  if (!line.trim()) return <span>&nbsp;</span>;

  const keywords: Record<string, string[]> = {
    bash:   ["echo", "apt", "set", "systemctl", "mysql", "mkdir", "chmod", "cp", "if", "fi", "then"],
    python: ["import", "from", "async", "await", "def", "class", "return", "if", "else", "for", "in"],
    nginx:  ["server", "location", "listen", "root", "include", "fastcgi_pass", "fastcgi_param", "try_files"],
    docker: ["FROM", "RUN", "COPY", "EXPOSE", "CMD", "ENV", "WORKDIR", "ADD", "ARG"],
  };
  const kws = keywords[lang] || [];
  const langColor = LANG_COLORS[lang] || LANG_COLORS.default;

  const parts = line.split(/(\s+|[{}();,\\])/);
  return (
    <span>
      {parts.map((part, i) => {
        if (kws.includes(part.trim())) return <span key={i} style={{ color: langColor }}>{part}</span>;
        if (part.startsWith("#") || part.startsWith("//")) return <span key={i} className="text-zinc-500 italic">{part}</span>;
        if (/^['"]/.test(part)) return <span key={i} className="text-emerald-400/80">{part}</span>;
        if (/^\d+$/.test(part.trim())) return <span key={i} className="text-yellow-400/80">{part}</span>;
        return <span key={i} className="text-zinc-300/70">{part}</span>;
      })}
    </span>
  );
}

// ── Shared code view ──────────────────────────────────────────────────────────
function CodeView({
  seq, visibleLines, lineIdx, scrollRef, compact = false,
}: {
  seq: typeof CODE_SEQUENCES[0];
  visibleLines: string[];
  lineIdx: number;
  scrollRef: React.RefObject<HTMLDivElement>;
  compact?: boolean;
}) {
  const langColor = LANG_COLORS[seq.lang] || LANG_COLORS.default;
  const lineH = compact ? 12.5 : 17.6; // px per line
  const visibleCount = compact ? 7 : 999;

  return (
    <div className="flex flex-col h-full" style={{ background: "oklch(0.115 0.008 265)" }}>
      {/* Titlebar */}
      <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-white/5 flex-shrink-0">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400/60" />
          <span className="w-2 h-2 rounded-full bg-yellow-400/60" />
          <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
        </div>
        <span style={{ color: langColor }}>{getFileIcon(seq.file)}</span>
        <span className="text-[10px] font-mono text-zinc-400 flex-1 truncate">{seq.file}</span>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] text-emerald-400 font-mono tracking-wide">LIVE</span>
        </div>
      </div>

      {/* Code area */}
      {compact ? (
        // Mini: translate-based scroll (no scrollbar)
        <div className="flex-1 overflow-hidden relative px-2 py-1.5">
          <div
            className="font-mono leading-[1.55] transition-transform duration-150 ease-out"
            style={{
              fontSize: "8.5px",
              transform: visibleLines.length > visibleCount
                ? `translateY(-${(visibleLines.length - visibleCount) * lineH}px)`
                : "translateY(0)",
            }}>
            {visibleLines.map((line, i) => (
              <div key={i} className={`truncate ${i === visibleLines.length - 1 ? "text-zinc-200" : "text-zinc-500"}`}>
                {line || "\u00a0"}
              </div>
            ))}
          </div>
          {/* Bottom fade */}
          <div className="absolute bottom-0 left-0 right-0 h-5 pointer-events-none"
            style={{ background: "linear-gradient(to top, oklch(0.115 0.008 265), transparent)" }} />
        </div>
      ) : (
        // Expanded: real scroll with line numbers
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-[1.6]"
          style={{ scrollbarWidth: "thin", scrollbarColor: "oklch(0.25 0.01 265) transparent" }}>
          {visibleLines.map((line, i) => (
            <div key={i} className="flex gap-3 group">
              <span className="text-zinc-700 select-none w-5 text-right flex-shrink-0 text-[10px]">{i + 1}</span>
              <span className={`flex-1 ${i === visibleLines.length - 1 ? "after:content-['▋'] after:animate-pulse after:text-violet-400 after:ml-0.5" : ""}`}>
                <HighlightedLine line={line} lang={seq.lang} />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-2.5 py-1 border-t border-white/5 flex items-center gap-2 flex-shrink-0">
        <span className="text-[9px] text-zinc-600 font-mono flex-1">{seq.lang.toUpperCase()} · {visibleLines.length} ln</span>
        <span className="text-[9px] text-zinc-600 font-mono">
          {lineIdx < seq.lines.length ? "writing..." : "done"}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface LiveCodePreviewProps {
  isGenerating: boolean;
  /** Render expanded inline (for right panel tab) */
  expanded?: boolean;
  onClose?: () => void;
}

export default function LiveCodePreview({ isGenerating, expanded = false, onClose }: LiveCodePreviewProps) {
  const [seqIdx, setSeqIdx] = useState(0);
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [lineIdx, setLineIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null!);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const seq = CODE_SEQUENCES[seqIdx % CODE_SEQUENCES.length];

  // Stream lines
  useEffect(() => {
    if (!isGenerating) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setVisibleLines([]);
    setLineIdx(0);

    intervalRef.current = setInterval(() => {
      setLineIdx(prev => {
        const next = prev + 1;
        if (next > seq.lines.length) {
          setSeqIdx(s => s + 1);
          setVisibleLines([]);
          return 0;
        }
        setVisibleLines(seq.lines.slice(0, next));
        return next;
      });
    }, 90);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isGenerating, seqIdx]);

  // Auto-scroll in expanded mode
  useEffect(() => {
    if (scrollRef.current && expanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleLines, expanded]);

  if (!isGenerating && visibleLines.length === 0) return null;

  // ── Inline expanded (right panel tab) ──
  if (expanded) {
    return (
      <div className="h-full">
        <CodeView seq={seq} visibleLines={visibleLines} lineIdx={lineIdx} scrollRef={scrollRef} />
      </div>
    );
  }

  // ── Mini card + hover overlay ──
  return (
    <div className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {/* Mini card */}
      <div
        className="rounded-lg overflow-hidden border border-white/8 shadow-xl transition-all duration-200"
        style={{
          width: "200px",
          height: "120px",
          opacity: hovered ? 0.3 : 1,
          transform: hovered ? "scale(0.97)" : "scale(1)",
        }}>
        <CodeView seq={seq} visibleLines={visibleLines} lineIdx={lineIdx} scrollRef={scrollRef} compact />
      </div>

      {/* Hover hint overlay on the card itself */}
      {hovered && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-lg"
          style={{ background: "oklch(0.115 0.008 265 / 0.5)" }}>
          <div className="flex items-center gap-1.5 bg-violet-500/20 border border-violet-400/30 rounded-md px-2.5 py-1.5">
            <span className="text-[10px] text-violet-300 font-medium">→ развернуть</span>
          </div>
        </div>
      )}

      {/* Portal overlay — expanded panel on the right */}
      {hovered && createPortal(
        <div
          className="fixed top-0 right-0 bottom-0 z-50 flex flex-col shadow-2xl"
          style={{
            width: "380px",
            animation: "slideInRight 0.2s ease-out",
          }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}>
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(20px); opacity: 0; }
              to   { transform: translateX(0);    opacity: 1; }
            }
          `}</style>
          <div className="h-full border-l border-white/8 overflow-hidden flex flex-col"
            style={{ background: "oklch(0.115 0.008 265)" }}>
            {/* Header with close */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 flex-shrink-0">
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
              </div>
              <span style={{ color: LANG_COLORS[seq.lang] || LANG_COLORS.default }}>{getFileIcon(seq.file)}</span>
              <span className="text-[11px] font-mono text-zinc-400 flex-1 truncate">{seq.file}</span>
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[9px] text-emerald-400 font-mono tracking-wide">LIVE</span>
              </div>
              {onClose && (
                <button onClick={onClose} className="p-0.5 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 ml-1">
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Code with line numbers */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-[1.65]"
              style={{ scrollbarWidth: "thin", scrollbarColor: "oklch(0.25 0.01 265) transparent" }}>
              {visibleLines.map((line, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-zinc-700 select-none w-5 text-right flex-shrink-0 text-[10px] pt-px">{i + 1}</span>
                  <span className={`flex-1 ${i === visibleLines.length - 1 ? "after:content-['▋'] after:animate-pulse after:text-violet-400 after:ml-0.5" : ""}`}>
                    <HighlightedLine line={line} lang={seq.lang} />
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-3 py-1.5 border-t border-white/5 flex items-center gap-2 flex-shrink-0">
              <span className="text-[9px] text-zinc-600 font-mono flex-1">
                {seq.lang.toUpperCase()} · {visibleLines.length} строк
              </span>
              <span className="text-[9px] text-zinc-600 font-mono">
                {lineIdx < seq.lines.length ? "записываю..." : "готово"}
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
