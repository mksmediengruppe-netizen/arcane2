// === LIVE CODE PREVIEW ===
// Mini floating card with live streaming code during agent execution.
// When a step is selected (via Steps tab), shows that step's specific code/output.
// On hover (mini mode): expands as a portal overlay on the right side of the screen.

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, FileCode, Terminal, FileText, Globe, Brain, ChevronLeft } from "lucide-react";

// ── Step payload type ─────────────────────────────────────────────────────────
export interface StepPayload {
  id: number;
  tool: "Browser" | "SSH" | "FileSystem" | "LLM";
  action: string;
  time: string;
  cost: number;
  /** Code/output to display in the live preview */
  file?: string;
  lang?: string;
  lines: string[];
}

// ── Per-step payloads ─────────────────────────────────────────────────────────
export const ENRICHED_STEPS: StepPayload[] = [
  {
    id: 1, tool: "Browser", action: "Открыл https://ubuntu.com/download", time: "0.3s", cost: 0.0002,
    file: "ubuntu.com/download", lang: "html",
    lines: [
      "<!-- ubuntu.com/download -->",
      "<html lang=\"en\">",
      "<head>",
      "  <title>Download Ubuntu Desktop</title>",
      "</head>",
      "<body>",
      "  <section class=\"p-strip\">",
      "    <h1>Ubuntu 22.04.3 LTS</h1>",
      "    <p>Download the latest LTS version of Ubuntu,",
      "       for desktop PCs and laptops.</p>",
      "    <a href=\"/ubuntu-22.04.3-desktop-amd64.iso\">",
      "      Download Ubuntu 22.04.3 LTS",
      "    </a>",
      "  </section>",
      "</body>",
      "</html>",
    ],
  },
  {
    id: 2, tool: "Browser", action: "Извлёк инструкции по установке", time: "0.8s", cost: 0.0012,
    file: "extracted_instructions.md", lang: "markdown",
    lines: [
      "# Ubuntu 22.04 — Bitrix Installation",
      "",
      "## System Requirements",
      "- RAM: 2GB minimum (4GB recommended)",
      "- Disk: 20GB free space",
      "- PHP: 8.1+",
      "- MySQL: 8.0+",
      "- Web server: nginx or Apache",
      "",
      "## Installation Steps",
      "1. Update system packages",
      "2. Install nginx + PHP 8.1-fpm",
      "3. Install MySQL Server 8.0",
      "4. Create database and user",
      "5. Download Bitrix distribution",
      "6. Configure nginx virtual host",
      "7. Run Bitrix setup wizard",
    ],
  },
  {
    id: 3, tool: "SSH", action: "Подключился к серверу 192.168.1.100", time: "0.1s", cost: 0.0001,
    file: "ssh://192.168.1.100", lang: "bash",
    lines: [
      "$ ssh root@192.168.1.100",
      "root@192.168.1.100's password: ****",
      "",
      "Welcome to Ubuntu 22.04.3 LTS (GNU/Linux 5.15.0-91-generic x86_64)",
      "",
      " * Documentation:  https://help.ubuntu.com",
      " * Management:     https://landscape.canonical.com",
      " * Support:        https://ubuntu.com/advantage",
      "",
      "System information as of Fri Apr  4 10:00:05 UTC 2026",
      "",
      "  System load:  0.08              Processes:             112",
      "  Usage of /:   12.4% of 49.09GB  Users logged in:       0",
      "  Memory usage: 18%               IPv4 address for eth0: 192.168.1.100",
      "",
      "root@server:~# ",
    ],
  },
  {
    id: 4, tool: "SSH", action: "Выполнил: apt update && apt upgrade -y", time: "45.2s", cost: 0.0089,
    file: "apt-update.log", lang: "bash",
    lines: [
      "root@server:~# apt update && apt upgrade -y",
      "Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease",
      "Get:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [119 kB]",
      "Get:3 http://security.ubuntu.com/ubuntu jammy-security InRelease [110 kB]",
      "Fetched 3,247 kB in 2s (1,623 kB/s)",
      "Reading package lists... Done",
      "Building dependency tree... Done",
      "Reading state information... Done",
      "47 packages can be upgraded.",
      "...",
      "Setting up linux-headers-5.15.0-101-generic (5.15.0-101.111) ...",
      "Setting up linux-image-5.15.0-101-generic (5.15.0-101.111) ...",
      "Processing triggers for initramfs-tools (0.140ubuntu13.4) ...",
      "update-initramfs: Generating /boot/initrd.img-5.15.0-101-generic",
      "",
      "root@server:~# echo 'System updated successfully'",
      "System updated successfully",
    ],
  },
  {
    id: 5, tool: "SSH", action: "Установил nginx, php8.1-fpm, mysql-server", time: "32.1s", cost: 0.0067,
    file: "apt-install.log", lang: "bash",
    lines: [
      "root@server:~# apt install -y nginx php8.1-fpm \\",
      "    php8.1-mysql php8.1-curl php8.1-gd \\",
      "    php8.1-mbstring php8.1-xml php8.1-zip \\",
      "    mysql-server",
      "",
      "Reading package lists... Done",
      "Building dependency tree... Done",
      "The following NEW packages will be installed:",
      "  nginx nginx-common php8.1-fpm php8.1-mysql",
      "  php8.1-curl php8.1-gd php8.1-mbstring",
      "  mysql-server mysql-server-8.0 ...",
      "",
      "0 upgraded, 38 newly installed, 0 to remove",
      "Need to get 67.4 MB of archives.",
      "...",
      "Setting up nginx (1.18.0-6ubuntu14.4) ...",
      "Setting up php8.1-fpm (8.1.2-1ubuntu2.14) ...",
      "Setting up mysql-server-8.0 (8.0.36-0ubuntu0.22.04.1) ...",
      "",
      "root@server:~# systemctl status nginx",
      "● nginx.service - A high performance web server",
      "   Active: active (running) since Fri 2026-04-04 10:01:02 UTC",
    ],
  },
  {
    id: 6, tool: "FileSystem", action: "Создал /etc/nginx/sites-available/bitrix.conf", time: "0.1s", cost: 0.0001,
    file: "/etc/nginx/sites-available/bitrix.conf", lang: "nginx",
    lines: [
      "server {",
      "    listen 80;",
      "    listen [::]:80;",
      "    server_name 192.168.1.100;",
      "    root /var/www/bitrix;",
      "    index index.php index.html;",
      "",
      "    charset utf-8;",
      "    client_max_body_size 1024M;",
      "",
      "    location / {",
      "        try_files $uri $uri/ /index.php?$query_string;",
      "    }",
      "",
      "    location ~ \\.php$ {",
      "        fastcgi_pass unix:/run/php/php8.1-fpm.sock;",
      "        fastcgi_index index.php;",
      "        fastcgi_param SCRIPT_FILENAME",
      "            $document_root$fastcgi_script_name;",
      "        include fastcgi_params;",
      "        fastcgi_read_timeout 300;",
      "    }",
      "",
      "    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg)$ {",
      "        expires max;",
      "        log_not_found off;",
      "    }",
      "}",
    ],
  },
  {
    id: 7, tool: "SSH", action: "Перезапустил nginx и php-fpm", time: "2.3s", cost: 0.0004,
    file: "systemctl-restart.log", lang: "bash",
    lines: [
      "root@server:~# nginx -t",
      "nginx: the configuration file /etc/nginx/nginx.conf syntax is ok",
      "nginx: configuration file /etc/nginx/nginx.conf test is successful",
      "",
      "root@server:~# systemctl restart nginx php8.1-fpm",
      "",
      "root@server:~# systemctl status nginx php8.1-fpm",
      "● nginx.service - A high performance web server",
      "   Active: active (running) since Fri 2026-04-04 10:02:36 UTC",
      "   Main PID: 18432 (nginx)",
      "",
      "● php8.1-fpm.service - The PHP 8.1 FastCGI Process Manager",
      "   Active: active (running) since Fri 2026-04-04 10:02:37 UTC",
      "   Main PID: 18445 (php-fpm8.1)",
      "",
      "root@server:~# curl -I http://localhost",
      "HTTP/1.1 200 OK",
      "Server: nginx/1.18.0 (Ubuntu)",
      "Content-Type: text/html; charset=UTF-8",
    ],
  },
  {
    id: 8, tool: "LLM", action: "Сгенерировал итоговый отчёт", time: "3.8s", cost: 0.1240,
    file: "install_report.md", lang: "markdown",
    lines: [
      "# ✅ Bitrix Installation Report",
      "",
      "**Server:** 192.168.1.100 (Ubuntu 22.04 LTS)",
      "**Duration:** 4m 12s  |  **Cost:** $1.2400",
      "**Status:** Installation completed successfully",
      "",
      "## Installed Components",
      "| Component | Version | Status |",
      "|-----------|---------|--------|",
      "| nginx | 1.18.0 | ✅ Running |",
      "| PHP-FPM | 8.1.2 | ✅ Running |",
      "| MySQL | 8.0.36 | ✅ Running |",
      "",
      "## Configuration",
      "- Virtual host: `/etc/nginx/sites-available/bitrix.conf`",
      "- PHP pool: `/etc/php/8.1/fpm/pool.d/www.conf`",
      "- Document root: `/var/www/bitrix`",
      "",
      "## Next Steps",
      "1. Open http://192.168.1.100/ in browser",
      "2. Follow Bitrix setup wizard",
      "3. Configure database connection",
      "4. Set admin credentials",
      "",
      "> 💡 Bitrix is now accessible at http://192.168.1.100/",
    ],
  },
];

// ── Colour / icon helpers ─────────────────────────────────────────────────────
const LANG_COLORS: Record<string, string> = {
  nginx:    "#68d391",
  bash:     "#f6ad55",
  python:   "#76e4f7",
  docker:   "#63b3ed",
  markdown: "#a78bfa",
  html:     "#f687b3",
  default:  "#a78bfa",
};

const TOOL_ICONS: Record<string, React.ReactNode> = {
  Browser:    <Globe size={10} />,
  SSH:        <Terminal size={10} />,
  FileSystem: <FileCode size={10} />,
  LLM:        <Brain size={10} />,
};

function getFileIcon(filename: string, tool?: string) {
  if (tool && TOOL_ICONS[tool]) return TOOL_ICONS[tool];
  if (filename.endsWith(".sh"))  return <Terminal size={10} />;
  if (filename.endsWith(".py"))  return <FileCode size={10} />;
  if (filename === "Dockerfile") return <FileCode size={10} />;
  return <FileText size={10} />;
}

// ── Syntax highlighter ────────────────────────────────────────────────────────
function HighlightedLine({ line, lang }: { line: string; lang: string }) {
  if (!line.trim()) return <span>&nbsp;</span>;

  const keywords: Record<string, string[]> = {
    bash:     ["echo", "apt", "set", "systemctl", "mysql", "mkdir", "chmod", "cp", "if", "fi", "curl", "root@server"],
    python:   ["import", "from", "async", "await", "def", "class", "return", "if", "else", "for", "in"],
    nginx:    ["server", "location", "listen", "root", "include", "fastcgi_pass", "fastcgi_param", "try_files", "expires"],
    docker:   ["FROM", "RUN", "COPY", "EXPOSE", "CMD", "ENV", "WORKDIR", "ADD", "ARG"],
    markdown: ["#", "##", "###", "**", "> "],
    html:     ["html", "head", "body", "title", "section", "div", "a", "p", "h1", "h2"],
  };
  const kws = keywords[lang] || [];
  const langColor = LANG_COLORS[lang] || LANG_COLORS.default;

  // Markdown special handling
  if (lang === "markdown") {
    if (line.startsWith("#"))  return <span style={{ color: langColor }} className="font-semibold">{line}</span>;
    if (line.startsWith(">"))  return <span className="text-zinc-500 italic">{line}</span>;
    if (line.startsWith("|"))  return <span className="text-emerald-400/70">{line}</span>;
    if (line.startsWith("- ")) return <span><span style={{ color: langColor }}>-</span><span className="text-zinc-300/70">{line.slice(1)}</span></span>;
    if (/^\d+\./.test(line))   return <span><span style={{ color: langColor }}>{line.match(/^\d+\./)?.[0]}</span><span className="text-zinc-300/70">{line.replace(/^\d+\./, "")}</span></span>;
  }

  const parts = line.split(/(\s+|[{}();,\\<>])/);
  return (
    <span>
      {parts.map((part, i) => {
        if (kws.some(k => part.trim().startsWith(k))) return <span key={i} style={{ color: langColor }}>{part}</span>;
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
  step, visibleLines, lineIdx, isStreaming, scrollRef, compact = false,
}: {
  step: StepPayload;
  visibleLines: string[];
  lineIdx: number;
  isStreaming: boolean;
  scrollRef: React.RefObject<HTMLDivElement>;
  compact?: boolean;
}) {
  const lang = step.lang || "bash";
  const langColor = LANG_COLORS[lang] || LANG_COLORS.default;
  const file = step.file || "output";
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
        <span style={{ color: langColor }}>{getFileIcon(file, step.tool)}</span>
        <span className="text-[10px] font-mono text-zinc-400 flex-1 truncate">{file}</span>
        {isStreaming && (
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-emerald-400 font-mono tracking-wide">LIVE</span>
          </div>
        )}
        {!isStreaming && (
          <span className="text-[9px] text-zinc-600 font-mono">{step.tool}</span>
        )}
      </div>

      {/* Code area */}
      {compact ? (
        <div className="flex-1 overflow-hidden relative px-2 py-1.5">
          <div
            className="font-mono leading-[1.55] transition-transform duration-150 ease-out"
            style={{
              fontSize: "8.5px",
              transform: visibleLines.length > visibleCount
                ? `translateY(-${(visibleLines.length - visibleCount) * 12.5}px)`
                : "translateY(0)",
            }}>
            {visibleLines.map((line, i) => (
              <div key={i} className={`truncate ${i === visibleLines.length - 1 && isStreaming ? "text-zinc-200" : "text-zinc-500"}`}>
                {line || "\u00a0"}
              </div>
            ))}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-5 pointer-events-none"
            style={{ background: "linear-gradient(to top, oklch(0.115 0.008 265), transparent)" }} />
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-[1.6]"
          style={{ scrollbarWidth: "thin", scrollbarColor: "oklch(0.25 0.01 265) transparent" }}>
          {visibleLines.map((line, i) => (
            <div key={i} className="flex gap-3 group">
              <span className="text-zinc-700 select-none w-5 text-right flex-shrink-0 text-[10px] pt-px">{i + 1}</span>
              <span className={`flex-1 ${i === visibleLines.length - 1 && isStreaming ? "after:content-['▋'] after:animate-pulse after:text-violet-400 after:ml-0.5" : ""}`}>
                <HighlightedLine line={line} lang={lang} />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-2.5 py-1 border-t border-white/5 flex items-center gap-2 flex-shrink-0">
        <span className="text-[9px] text-zinc-600 font-mono flex-1">
          {lang.toUpperCase()} · {visibleLines.length} ln
        </span>
        <span className="text-[9px] text-zinc-600 font-mono">
          {isStreaming ? (lineIdx < step.lines.length ? "writing..." : "done") : `${step.time} · $${step.cost.toFixed(4)}`}
        </span>
      </div>
    </div>
  );
}

// ── Auto-streaming hook ───────────────────────────────────────────────────────
function useStreamLines(step: StepPayload, active: boolean) {
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [lineIdx, setLineIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) {
      // Show all lines immediately when step is pinned (not live-streaming)
      setVisibleLines(step.lines);
      setLineIdx(step.lines.length);
      return;
    }
    setVisibleLines([]);
    setLineIdx(0);

    intervalRef.current = setInterval(() => {
      setLineIdx(prev => {
        const next = prev + 1;
        if (next > step.lines.length) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return prev;
        }
        setVisibleLines(step.lines.slice(0, next));
        return next;
      });
    }, 90);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [step, active]);

  return { visibleLines, lineIdx, isStreaming: active && lineIdx < step.lines.length };
}

// ── Main component ────────────────────────────────────────────────────────────
interface LiveCodePreviewProps {
  isGenerating: boolean;
  /** When set, shows this step's code instead of auto-streaming */
  selectedStep?: StepPayload | null;
  /** Render expanded inline (for right panel tab) */
  expanded?: boolean;
  onClose?: () => void;
  onBack?: () => void;
}

export default function LiveCodePreview({
  isGenerating,
  selectedStep = null,
  expanded = false,
  onClose,
  onBack,
}: LiveCodePreviewProps) {
  // Auto-cycle through sequences when live-generating with no step pinned
  const [autoSeqIdx, setAutoSeqIdx] = useState(0);
  const autoSeq = ENRICHED_STEPS[autoSeqIdx % ENRICHED_STEPS.length];

  const activeStep = selectedStep || (isGenerating ? autoSeq : null);

  const scrollRef = useRef<HTMLDivElement>(null!);
  const [hovered, setHovered] = useState(false);

  // Auto-advance sequence when not pinned
  const autoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!isGenerating || selectedStep) return;
    autoIntervalRef.current = setInterval(() => {
      setAutoSeqIdx(i => i + 1);
    }, autoSeq.lines.length * 90 + 500);
    return () => { if (autoIntervalRef.current) clearInterval(autoIntervalRef.current); };
  }, [isGenerating, selectedStep, autoSeq.lines.length]);

  const { visibleLines, lineIdx, isStreaming } = useStreamLines(
    activeStep || ENRICHED_STEPS[0],
    isGenerating && !selectedStep,
  );

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [visibleLines]);

  if (!activeStep) return null;

  // ── Inline expanded (right panel tab) ──
  if (expanded) {
    return (
      <div className="flex flex-col h-full">
        {onBack && (
          <button onClick={onBack}
            className="flex items-center gap-1 px-3 py-1.5 border-b border-white/5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
            style={{ background: "oklch(0.115 0.008 265)" }}>
            <ChevronLeft size={11} /> Назад к Live
          </button>
        )}
        <div className="flex-1 overflow-hidden">
          <CodeView step={activeStep} visibleLines={visibleLines} lineIdx={lineIdx}
            isStreaming={isStreaming} scrollRef={scrollRef} />
        </div>
      </div>
    );
  }

  // ── Mini card + hover portal overlay ──
  return (
    <div className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {/* Mini card */}
      <div className="rounded-lg overflow-hidden border border-white/8 shadow-xl transition-all duration-200"
        style={{
          width: "200px", height: "120px",
          opacity: hovered ? 0.3 : 1,
          transform: hovered ? "scale(0.97)" : "scale(1)",
        }}>
        <CodeView step={activeStep} visibleLines={visibleLines} lineIdx={lineIdx}
          isStreaming={isStreaming} scrollRef={scrollRef} compact />
      </div>

      {/* Hover hint */}
      {hovered && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-lg"
          style={{ background: "oklch(0.115 0.008 265 / 0.5)" }}>
          <div className="flex items-center gap-1.5 bg-violet-500/20 border border-violet-400/30 rounded-md px-2.5 py-1.5">
            <span className="text-[10px] text-violet-300 font-medium">→ развернуть</span>
          </div>
        </div>
      )}

      {/* Portal overlay */}
      {hovered && createPortal(
        <div
          className="fixed top-0 right-0 bottom-0 z-50 flex flex-col shadow-2xl"
          style={{ width: "380px", animation: "slideInRight 0.2s ease-out" }}
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
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/5 flex-shrink-0">
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-400/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/60" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/60" />
              </div>
              <span style={{ color: LANG_COLORS[activeStep.lang || "bash"] || LANG_COLORS.default }}>
                {getFileIcon(activeStep.file || "output", activeStep.tool)}
              </span>
              <span className="text-[11px] font-mono text-zinc-400 flex-1 truncate">{activeStep.file}</span>
              <div className="flex items-center gap-1.5">
                {isStreaming && <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /><span className="text-[9px] text-emerald-400 font-mono tracking-wide">LIVE</span></>}
              </div>
              {onClose && (
                <button onClick={onClose} className="p-0.5 rounded hover:bg-white/10 text-zinc-500 hover:text-zinc-300 ml-1">
                  <X size={11} />
                </button>
              )}
            </div>

            {/* Code */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-[11px] leading-[1.65]"
              style={{ scrollbarWidth: "thin", scrollbarColor: "oklch(0.25 0.01 265) transparent" }}>
              {visibleLines.map((line, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-zinc-700 select-none w-5 text-right flex-shrink-0 text-[10px] pt-px">{i + 1}</span>
                  <span className={`flex-1 ${i === visibleLines.length - 1 && isStreaming ? "after:content-['▋'] after:animate-pulse after:text-violet-400 after:ml-0.5" : ""}`}>
                    <HighlightedLine line={line} lang={activeStep.lang || "bash"} />
                  </span>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="px-3 py-1.5 border-t border-white/5 flex items-center gap-2 flex-shrink-0">
              <span className="text-[9px] text-zinc-600 font-mono flex-1">
                {(activeStep.lang || "bash").toUpperCase()} · {visibleLines.length} строк
              </span>
              <span className="text-[9px] text-zinc-600 font-mono">
                {isStreaming ? "записываю..." : `${activeStep.time} · $${activeStep.cost.toFixed(4)}`}
              </span>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
