// === LIVE CODE PREVIEW ===
// Mini floating card with live streaming code during agent execution.
// When a step is selected (via Steps tab), shows that step's specific code/output.
// On hover (mini mode): expands as a portal overlay on the right side of the screen.

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, FileCode, Terminal, FileText, Globe, Brain, ChevronLeft, Copy, Check, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { marked } from "marked";

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

// ── Lang → file extension map ────────────────────────────────────────────────────────────────
const LANG_EXT: Record<string, string> = {
  bash:     "sh",
  nginx:    "conf",
  python:   "py",
  docker:   "Dockerfile",
  markdown: "md",
  html:     "html",
  sql:      "sql",
};

function getDownloadFilename(step: StepPayload): string {
  // If the step has a file path, derive the name from it
  if (step.file) {
    const base = step.file.split("/").pop() || step.file;
    // If it already has an extension, use as-is
    if (base.includes(".") || base === "Dockerfile") return base;
    // Otherwise append the lang extension
    const ext = LANG_EXT[step.lang || ""] || "txt";
    return `${base}.${ext}`;
  }
  const ext = LANG_EXT[step.lang || ""] || "txt";
  return `step-${step.id}.${ext}`;
}

// ── Download hook ────────────────────────────────────────────────────────────────
function useDownloadCode(step: StepPayload) {
  const download = useCallback(() => {
    const text = step.lines.join("\n");
    const filename = getDownloadFilename(step);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Скачан: ${filename}`, { duration: 2000 });
  }, [step]);
  return { download };
}

// ── HTML preview hook ────────────────────────────────────────────────────────────────
function useHtmlPreview(step: StepPayload) {
  const isHtml = (step.lang || "") === "html";
  const preview = useCallback(() => {
    const html = step.lines.join("\n");
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast.success("Открыт превью HTML", { duration: 1800 });
  }, [step]);
  return { isHtml, preview };
}

// ── Markdown preview hook ────────────────────────────────────────────────────────────────
const MD_PREVIEW_STYLE = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 860px; margin: 0 auto; padding: 2.5rem 2rem;
    background: #0f1117; color: #e2e8f0;
    line-height: 1.75;
  }
  h1, h2, h3, h4 { color: #f8fafc; font-weight: 700; margin-top: 2rem; margin-bottom: 0.75rem; }
  h1 { font-size: 2rem; border-bottom: 1px solid #334155; padding-bottom: 0.5rem; }
  h2 { font-size: 1.4rem; border-bottom: 1px solid #1e293b; padding-bottom: 0.35rem; }
  h3 { font-size: 1.1rem; }
  p { margin: 0.75rem 0; }
  a { color: #818cf8; text-decoration: none; }
  a:hover { text-decoration: underline; }
  code {
    background: #1e293b; color: #a5f3fc;
    padding: 0.15em 0.4em; border-radius: 4px;
    font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.875em;
  }
  pre {
    background: #1e293b; border: 1px solid #334155;
    border-radius: 8px; padding: 1.25rem; overflow-x: auto;
    margin: 1.25rem 0;
  }
  pre code { background: none; padding: 0; color: #e2e8f0; }
  blockquote {
    border-left: 3px solid #6366f1; margin: 1rem 0;
    padding: 0.5rem 1rem; background: #1e293b; border-radius: 0 6px 6px 0;
    color: #94a3b8;
  }
  ul, ol { padding-left: 1.5rem; margin: 0.75rem 0; }
  li { margin: 0.35rem 0; }
  table { border-collapse: collapse; width: 100%; margin: 1.25rem 0; }
  th { background: #1e293b; color: #f8fafc; padding: 0.6rem 1rem; text-align: left; }
  td { padding: 0.5rem 1rem; border-bottom: 1px solid #1e293b; }
  tr:hover td { background: #0f172a; }
  hr { border: none; border-top: 1px solid #334155; margin: 2rem 0; }
  img { max-width: 100%; border-radius: 8px; }
`;

function useMarkdownPreview(step: StepPayload) {
  const isMd = (step.lang || "") === "markdown";
  const preview = useCallback(async () => {
    const md = step.lines.join("\n");
    const body = await marked.parse(md);
    const title = step.file ? step.file.split("/").pop() || step.file : "Preview";
    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${MD_PREVIEW_STYLE}</style></head><body>${body}</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    toast.success("Открыт превью Markdown", { duration: 1800 });
  }, [step]);
  return { isMd, preview };
}

// ── Copy hook ────────────────────────────────────────────────────────────────
function useCopyCode(lines: string[]) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    const text = lines.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Код скопирован", { duration: 1800 });
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      toast.error("Не удалось скопировать");
    });
  }, [lines]);
  return { copied, copy };
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
  const { copied, copy } = useCopyCode(step.lines);
  const { download } = useDownloadCode(step);
  const { isHtml, preview: htmlPreview } = useHtmlPreview(step);
  const { isMd, preview: mdPreview } = useMarkdownPreview(step);

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
        {!compact && (
          <div className="flex items-center gap-0.5 ml-1">
            {isHtml && (
              <button
                onClick={htmlPreview}
                title="Открыть HTML в новой вкладке"
                className="p-1 rounded transition-all duration-150 text-sky-500 hover:text-sky-300 hover:bg-sky-500/10">
                <ExternalLink size={11} />
              </button>
            )}
            {isMd && (
              <button
                onClick={mdPreview}
                title="Открыть Markdown превью"
                className="p-1 rounded transition-all duration-150 text-violet-400 hover:text-violet-200 hover:bg-violet-500/10">
                <ExternalLink size={11} />
              </button>
            )}
            <button
              onClick={download}
              title={`Скачать ${getDownloadFilename(step)}`}
              className="p-1 rounded transition-all duration-150 text-zinc-600 hover:text-zinc-300 hover:bg-white/8">
              <Download size={11} />
            </button>
            <button
              onClick={copy}
              title="Копировать код"
              className={`p-1 rounded transition-all duration-150 ${
                copied
                  ? "text-emerald-400 bg-emerald-400/10"
                  : "text-zinc-600 hover:text-zinc-300 hover:bg-white/8"
              }`}>
              {copied ? <Check size={11} /> : <Copy size={11} />}
            </button>
          </div>
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

// ── Portal overlay action buttons (standalone to avoid hook-in-portal issues) ────────────────────────
function PortalCopyButton({ lines }: { lines: string[] }) {
  const { copied, copy } = useCopyCode(lines);
  return (
    <button
      onClick={copy}
      title="Копировать код"
      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all duration-150 ${
        copied
          ? "text-emerald-400 bg-emerald-400/10"
          : "text-zinc-500 hover:text-zinc-300 hover:bg-white/8"
      }`}>
      {copied ? <Check size={11} /> : <Copy size={11} />}
      <span className="font-mono">{copied ? "Скопировано" : "Copy"}</span>
    </button>
  );
}

function PortalDownloadButton({ step }: { step: StepPayload }) {
  const { download } = useDownloadCode(step);
  return (
    <button
      onClick={download}
      title={`Скачать ${getDownloadFilename(step)}`}
      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all duration-150 text-zinc-500 hover:text-zinc-300 hover:bg-white/8">
      <Download size={11} />
      <span className="font-mono">{getDownloadFilename(step)}</span>
    </button>
  );
}

function PortalHtmlPreviewButton({ step }: { step: StepPayload }) {
  const { isHtml, preview } = useHtmlPreview(step);
  if (!isHtml) return null;
  return (
    <button
      onClick={preview}
      title="Открыть HTML в новой вкладке"
      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all duration-150 text-sky-400 hover:text-sky-200 hover:bg-sky-500/10">
      <ExternalLink size={11} />
      <span className="font-mono">Preview</span>
    </button>
  );
}

function PortalMarkdownPreviewButton({ step }: { step: StepPayload }) {
  const { isMd, preview } = useMarkdownPreview(step);
  if (!isMd) return null;
  return (
    <button
      onClick={preview}
      title="Открыть Markdown превью"
      className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all duration-150 text-violet-400 hover:text-violet-200 hover:bg-violet-500/10">
      <ExternalLink size={11} />
      <span className="font-mono">Preview</span>
    </button>
  );
}

// ── Auto-streaming hook ──────────────────────────────────────────────────────────
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
  const { copied: expandedCopied, copy: expandedCopy } = useCopyCode(activeStep.lines);
  const { download: expandedDownload } = useDownloadCode(activeStep);

  if (expanded) {
    return (
      <div className="flex flex-col h-full">
        {/* Back bar with copy button */}
        <div className="flex items-center border-b border-white/5 flex-shrink-0"
          style={{ background: "oklch(0.115 0.008 265)" }}>
          {onBack && (
            <button onClick={onBack}
              className="flex items-center gap-1 px-3 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex-1">
              <ChevronLeft size={11} /> Назад к Live
            </button>
          )}
          <div className="flex items-center gap-0.5 pr-1">
            {(activeStep.lang || "") === "html" && (
              <button
                onClick={() => {
                  const html = activeStep.lines.join("\n");
                  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  window.open(url, "_blank", "noopener");
                  setTimeout(() => URL.revokeObjectURL(url), 10_000);
                  toast.success("Открыт превью HTML", { duration: 1800 });
                }}
                title="Открыть HTML в новой вкладке"
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] text-sky-400 hover:text-sky-200 transition-colors">
                <ExternalLink size={11} />
                <span>Preview</span>
              </button>
            )}
            {(activeStep.lang || "") === "markdown" && (
              <button
                onClick={async () => {
                  const md = activeStep.lines.join("\n");
                  const body = await marked.parse(md);
                  const title = activeStep.file ? activeStep.file.split("/").pop() || activeStep.file : "Preview";
                  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${title}</title><style>${MD_PREVIEW_STYLE}</style></head><body>${body}</body></html>`;
                  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  window.open(url, "_blank", "noopener");
                  setTimeout(() => URL.revokeObjectURL(url), 10_000);
                  toast.success("Открыт превью Markdown", { duration: 1800 });
                }}
                title="Открыть Markdown превью"
                className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] text-violet-400 hover:text-violet-200 transition-colors">
                <ExternalLink size={11} />
                <span>Preview</span>
              </button>
            )}
            <button
              onClick={expandedDownload}
              title={`Скачать ${getDownloadFilename(activeStep)}`}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors">
              <Download size={11} />
              <span>{getDownloadFilename(activeStep)}</span>
            </button>
            <button
              onClick={expandedCopy}
              title="Копировать код"
              className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] transition-all duration-150 ${
                expandedCopied
                  ? "text-emerald-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}>
              {expandedCopied ? <Check size={11} /> : <Copy size={11} />}
              <span>{expandedCopied ? "Скопировано" : "Копировать"}</span>
            </button>
          </div>
        </div>
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
              {/* HTML / MD Preview + Download + Copy buttons in portal overlay */}
              <div className="flex items-center gap-0.5">
                <PortalHtmlPreviewButton step={activeStep} />
                <PortalMarkdownPreviewButton step={activeStep} />
                <PortalDownloadButton step={activeStep} />
                <PortalCopyButton lines={activeStep.lines} />
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
