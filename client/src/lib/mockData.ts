// === ARCANE 2 PROTOTYPE — Mock Data ===
// All data is simulated for UI testing purposes

export type TaskStatus = "running" | "done" | "error" | "warning" | "idle";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  model?: string;
  tokens?: { in: number; out: number };
  cost?: number;
  thinking?: string;
  latency?: number; // response time in seconds
}

export interface Task {
  id: string;
  name: string;
  status: TaskStatus;
  cost: number;
  duration: string;
  model: string;
  messages: Message[];
  createdAt: string;
  pinned?: boolean;
  budget?: number;     // per-task spend limit in USD
  usedAgents?: UsedAgentRecord[]; // agents that participated in this task
  chatMode?: string;              // mode used when task was sent
  collectiveModelIds?: string[];  // models used in collective mode
  agentModelOverrides?: Record<string, string>; // manual model overrides per agent (MANUAL mode)
}

export interface UsedAgentRecord {
  agentId: string;    // e.g. "coder"
  modelId: string;    // resolved model (default or overridden)
  modelOverridden: boolean; // true if user manually changed the model in MANUAL mode
  addedAt: string;    // ISO timestamp
}

export interface Project {
  id: string;
  name: string;
  tasks: Task[];
  createdAt: string;
  budget?: number;    // optional budget limit in USD
  spentCost?: number; // cumulative cost — never decreases even when tasks are deleted
}

export interface RaceResult {
  modelId: string;
  time: number;
  cost: number;
  tokensIn: number;
  tokensOut: number;
  output: string;
  score: number;
}

export interface Race {
  id: string;
  task: string;
  category: string;
  timestamp: string;
  runners: RaceResult[];
}

export const MODELS = [
  // ── Flagship ────────────────────────────────────────────────────────────────
  { id: "claude-opus-4.6",   name: "Claude Opus 4.6",    provider: "Anthropic", color: "#D4A574", icon: "◈", costIn: 5,    costOut: 25,   tier: "genius",  isFree: false, context: 1000, swe: 80.8, superpower: "Deep reasoning, архитектура",     transport: "native" },
  { id: "gpt-5.4",           name: "GPT-5.4",            provider: "OpenAI",    color: "#C4A7E7", icon: "●", costIn: 2.5,  costOut: 15,   tier: "genius",  isFree: false, context: 1000, swe: 80.0, superpower: "Code audit #1",                  transport: "native" },
  // ── Standard ────────────────────────────────────────────────────────────────
  { id: "claude-sonnet-4.6", name: "Claude Sonnet 4.6",  provider: "Anthropic", color: "#7EB8DA", icon: "◇", costIn: 3,    costOut: 15,   tier: "standard", isFree: false, context: 1000, swe: 79.6, superpower: "Frontend/дизайн #1",             transport: "native" },
  { id: "gemini-3.1-pro",    name: "Gemini 3.1 Pro",     provider: "Google",    color: "#F2C078", icon: "✦", costIn: 2,    costOut: 12,   tier: "standard", isFree: false, context: 1000, swe: 80.6, superpower: "SWE #1, код",                   transport: "openrouter" },
  { id: "deepseek-v3.2",     name: "DeepSeek V3.2",      provider: "DeepSeek",  color: "#82C9A5", icon: "◆", costIn: 0.28, costOut: 0.42,  tier: "optimum",  isFree: false, context: 128,  swe: 73.0, superpower: "Дешёвый код",                   transport: "openrouter" },
  { id: "minimax-m2.5",      name: "MiniMax M2.5",       provider: "MiniMax",   color: "#E09F7D", icon: "■", costIn: 0.3,  costOut: 1.2,  tier: "standard", isFree: false, context: 256,  swe: 80.2, superpower: "Open-weight",                   transport: "openrouter" },
  // ── Fast ────────────────────────────────────────────────────────────────────
  { id: "claude-haiku-4.5",  name: "Claude Haiku 4.5",   provider: "Anthropic", color: "#A8D5BA", icon: "△", costIn: 1,    costOut: 5,    tier: "fast",     isFree: false, context: 200,  swe: null, superpower: "Быстрый, vision",               transport: "native" },
  { id: "gpt-5.4-mini",      name: "GPT-5.4 Mini",       provider: "OpenAI",    color: "#B8A9C9", icon: "○", costIn: 0.75, costOut: 4.5,  tier: "fast",     isFree: false, context: 400,  swe: null, superpower: "Планирование",                  transport: "native" },
  { id: "gpt-5.4-nano",      name: "GPT-5.4 Nano",       provider: "OpenAI",    color: "#9E9EC9", icon: "·", costIn: 0.20, costOut: 1.25, tier: "fast",     isFree: false, context: 400,  swe: null, superpower: "Классификация",                 transport: "native" },
  { id: "gemini-2.5-flash",  name: "Gemini 2.5 Flash",   provider: "Google",    color: "#E8D5A3", icon: "⚡", costIn: 0.3,  costOut: 2.5,  tier: "fast",     isFree: false, context: 1000, swe: null, superpower: "Оркестратор",                   transport: "openrouter" },
  // ── Free ────────────────────────────────────────────────────────────────────
  { id: "kimi-k2.5",         name: "Kimi K2.5",          provider: "Moonshot",  color: "#78C8E0", icon: "☽", costIn: 0,    costOut: 0,    tier: "free",     isFree: true,  context: null, swe: 76.8, superpower: "#2 по usage, OpenRouter",       transport: "openrouter" },
  { id: "step-3.5-flash",    name: "Step 3.5 Flash",     provider: "StepFun",   color: "#90C8A0", icon: "→", costIn: 0,    costOut: 0,    tier: "free",     isFree: true,  context: 128,  swe: 74.4, superpower: "Бесплатный",                    transport: "openrouter" },
  { id: "nemotron-3-super",  name: "Nemotron 3 Super",   provider: "NVIDIA",    color: "#76B900", icon: "⬡", costIn: 0,    costOut: 0,    tier: "free",     isFree: true,  context: 1000, swe: null, superpower: "NVIDIA, бесплатный",            transport: "openrouter" },
];

// ── Image Generation Models ──────────────────────────────────────────────────
export interface ImageModel {
  id: string;
  name: string;
  provider: string;
  color: string;
  costPerImage: number | null;
  isFree: boolean;
  superpower: string;
  style: string; // photorealistic | artistic | typography | svg | fast | stock
}

export const IMAGE_MODELS: ImageModel[] = [
  { id: "flux-2-pro",    name: "Flux 2 Pro",      provider: "Black Forest", color: "#E05A5A", costPerImage: 0.055,  isFree: false, superpower: "Фотореализм #1",       style: "photorealistic" },
  { id: "midjourney-v8", name: "Midjourney V8",   provider: "Midjourney",  color: "#9B59B6", costPerImage: 0.10,   isFree: false, superpower: "Художественное #1",    style: "artistic" },
  { id: "ideogram-v3",   name: "Ideogram V3",     provider: "Ideogram",    color: "#3498DB", costPerImage: 0.04,   isFree: false, superpower: "Типографика 95%",      style: "typography" },
  { id: "recraft-v4",    name: "Recraft V4",      provider: "Recraft",     color: "#1ABC9C", costPerImage: 0.04,   isFree: false, superpower: "SVG export #1",        style: "svg" },
  { id: "flux-schnell",  name: "Flux Schnell",    provider: "Black Forest", color: "#F39C12", costPerImage: 0.015,  isFree: false, superpower: "Быстро + дёшево",     style: "fast" },
  { id: "pexels-api",    name: "Pexels API",      provider: "Pexels",      color: "#05A081", costPerImage: null,   isFree: true,  superpower: "Стоковые фото, Free",  style: "stock" },
];

export const MODEL_MAP = Object.fromEntries(MODELS.map(m => [m.id, m]));
export const getModel = (id: string) => MODEL_MAP[id] || MODELS[1];

export const TIERS = [
  { id: "fast",     label: "Быстрый",   desc: "Haiku, Flash, Mini",  models: ["claude-haiku-4.5", "gpt-5.4-mini", "gemini-2.5-flash"] },
  { id: "standard", label: "Стандарт",  desc: "Sonnet, Gemini Pro",  models: ["claude-sonnet-4.6", "gemini-3.1-pro", "minimax-m2.5"] },
  { id: "genius",   label: "Гений",     desc: "Opus, GPT-5.4",       models: ["claude-opus-4.6", "gpt-5.4"] },
  { id: "optimum",  label: "Оптимум",   desc: "DeepSeek — цена/кач.", models: ["deepseek-v3.2", "deepseek-r2"] },
];

export const CATEGORIES = [
  { id: "design",  label: "Дизайн / HTML", emoji: "🎨" },
  { id: "backend", label: "Backend / API",  emoji: "⚙️" },
  { id: "review",  label: "Code Review",   emoji: "🔍" },
  { id: "text",    label: "Тексты / Copy", emoji: "✍️" },
  { id: "devops",  label: "DevOps",        emoji: "🚀" },
];

export const formatCost = (cost: number): string => {
  if (cost === 0) return "$0.00";
  if (cost < 0.001) return `$${(cost * 1_000_000).toFixed(0)}µ`;
  if (cost < 0.01) return `$${(cost * 1000).toFixed(2)}m`;
  return `$${cost.toFixed(4)}`;
};

export const formatCostShort = (cost: number): string => {
  if (cost === 0) return "$0";
  if (cost < 0.01) return `<$0.01`;
  return `$${cost.toFixed(2)}`;
};

// ── Mock Projects & Tasks ──────────────────────────────────────────────────
export const MOCK_PROJECTS: Project[] = [
  {
    id: "p1",
    name: "Bitrix Landing",
    createdAt: "2026-04-01",
    budget: 5.00,
    tasks: [
      {
        id: "t1", name: "Установка Bitrix на сервер", status: "done", pinned: true,
        cost: 1.24, duration: "4m 12s", model: "claude-sonnet-4.6", createdAt: "2026-04-01",
        messages: [
          { id: "m1", role: "user", content: "Установи Bitrix CMS на сервер Ubuntu 22.04. Нужен полный процесс: nginx, php-fpm, mysql, настройка прав.", timestamp: "10:00" },
          {
            id: "m2", role: "assistant", model: "claude-sonnet-4.6",
            thinking: "Анализирую задачу. Нужно установить Bitrix на Ubuntu 22.04. Стандартный стек: nginx + php-fpm 8.1 + MySQL 8.0. Проверю совместимость версий PHP с Bitrix — нужна 8.1, не 8.2. Порядок: обновление системы → установка зависимостей → настройка nginx → php-fpm → mysql → скачивание Bitrix → настройка прав.",
            content: "## Установка Bitrix CMS на Ubuntu 22.04\n\nВыполняю установку по шагам:\n\n**1. Обновление системы и установка зависимостей**\n```bash\napt update && apt upgrade -y\napt install -y nginx php8.1-fpm php8.1-mysql php8.1-gd php8.1-curl php8.1-mbstring\n```\n\n**2. Настройка MySQL 8.0**\n```bash\napt install -y mysql-server\nmysql_secure_installation\nmysql -u root -p -e \"CREATE DATABASE bitrix CHARACTER SET utf8mb4;\"\n```\n\n**3. Конфигурация nginx**\n```nginx\nserver {\n    listen 80;\n    root /var/www/bitrix;\n    index index.php;\n    location ~ \\.php$ {\n        fastcgi_pass unix:/run/php/php8.1-fpm.sock;\n    }\n}\n```\n\n✅ Установка завершена. Bitrix доступен по адресу http://your-server-ip/",
            timestamp: "10:04", tokens: { in: 1240, out: 3850 }, cost: 1.24,
          },
        ],
      },
      {
        id: "t2", name: "Настройка SSL сертификата", status: "done",
        cost: 0.38, duration: "2m 45s", model: "claude-haiku-4.5", createdAt: "2026-04-01",
        messages: [
          { id: "m3", role: "user", content: "Настрой Let's Encrypt SSL для домена example.com на nginx.", timestamp: "11:00" },
          { id: "m4", role: "assistant", model: "claude-haiku-4.5", content: "## Настройка Let's Encrypt SSL\n\n```bash\napt install -y certbot python3-certbot-nginx\ncertbot --nginx -d example.com -d www.example.com\n```\n\nАвтообновление уже настроено через systemd timer. Сертификат действителен 90 дней.\n\n✅ HTTPS активирован, HTTP автоматически редиректит на HTTPS.", timestamp: "11:02", tokens: { in: 420, out: 1100 }, cost: 0.38 },
        ],
      },
      {
        id: "t3", name: "Оптимизация скорости загрузки", status: "error",
        cost: 0.12, duration: "1m 03s", model: "gpt-5.4-mini", createdAt: "2026-04-02",
        messages: [
          { id: "m5", role: "user", content: "Оптимизируй скорость загрузки сайта. Lighthouse показывает 45 баллов.", timestamp: "14:00" },
          { id: "m6", role: "assistant", model: "gpt-5.4-mini", content: "Анализирую проблемы производительности...\n\n❌ **Ошибка:** Не удалось получить доступ к файловой системе сервера. Проверьте SSH-ключи и права доступа.", timestamp: "14:01", tokens: { in: 380, out: 290 }, cost: 0.12 },
        ],
      },
      {
        id: "t4", name: "Настройка резервного копирования", status: "warning",
        cost: 0.54, duration: "3m 18s", model: "deepseek-v3.2", createdAt: "2026-04-02",
        messages: [
          { id: "m7", role: "user", content: "Настрой автоматическое резервное копирование базы данных и файлов на S3.", timestamp: "15:00" },
          { id: "m8", role: "assistant", model: "deepseek-v3.2", content: "## Настройка бэкапов на S3\n\n⚠️ **Предупреждение:** Ключи AWS не найдены в переменных окружения. Скрипт создан, но требует ввода credentials.\n\n```bash\n#!/bin/bash\n# /etc/cron.daily/backup-bitrix\nmysqldump -u root bitrix | gzip | aws s3 cp - s3://your-bucket/db/$(date +%Y%m%d).sql.gz\ntar -czf - /var/www/bitrix | aws s3 cp - s3://your-bucket/files/$(date +%Y%m%d).tar.gz\n```\n\nДобавьте AWS_ACCESS_KEY_ID и AWS_SECRET_ACCESS_KEY в /etc/environment.", timestamp: "15:03", tokens: { in: 890, out: 2100 }, cost: 0.54 },
        ],
      },
    ],
  },
  {
    id: "p2",
    name: "AI Чат-бот для клиентов",
    createdAt: "2026-04-02",
    budget: 4.00,
    tasks: [
      {
        id: "t5", name: "Архитектура RAG-системы", status: "done",
        cost: 2.87, duration: "8m 40s", model: "claude-opus-4.6", createdAt: "2026-04-02",
        messages: [
          { id: "m9", role: "user", content: "Спроектируй RAG-систему для чат-бота поддержки клиентов. База знаний — 500 PDF документов.", timestamp: "09:00" },
          {
            id: "m10", role: "assistant", model: "claude-opus-4.6",
            thinking: "Задача: RAG для 500 PDF. Нужно выбрать: векторную БД (Chroma vs Pinecone vs Weaviate), embedding модель (text-embedding-3-large vs BGE), стратегию чанкинга (semantic vs fixed), retriever (dense vs hybrid). Для 500 PDF оптимально: Chroma (self-hosted, бесплатно), semantic chunking по 512 токенов с 50 overlap, hybrid search (BM25 + dense). LLM для генерации — Claude Sonnet (баланс цена/качество).",
            content: "## Архитектура RAG-системы для поддержки клиентов\n\n### Компоненты стека\n\n| Компонент | Решение | Обоснование |\n|---|---|---|\n| Vector DB | ChromaDB | Self-hosted, бесплатно, 500 PDF влезет |\n| Embeddings | text-embedding-3-large | Лучшее качество для русского языка |\n| Chunking | Semantic (512 токенов) | Сохраняет контекст документа |\n| Retrieval | Hybrid BM25 + Dense | +15% точности vs только dense |\n| LLM | Claude Sonnet 4.6 | Баланс цена/качество |\n\n### Схема обработки запроса\n```\nUser Query → Embedding → ChromaDB Search → Reranking → Context Assembly → LLM → Response\n```\n\n### Оценка производительности\n- Latency P95: ~2.3s\n- Стоимость запроса: ~$0.003\n- Точность (Hit Rate @5): ~87%",
            timestamp: "09:08", tokens: { in: 2100, out: 5800 }, cost: 2.87,
          },
        ],
      },
      {
        id: "t6", name: "Интеграция с Telegram", status: "running",
        cost: 0.91, duration: "2m 10s (идёт...)", model: "gpt-5.4", createdAt: "2026-04-03",
        messages: [
          { id: "m11", role: "user", content: "Напиши Python-код для Telegram-бота с интеграцией нашей RAG-системы.", timestamp: "10:30" },
          { id: "m12", role: "assistant", model: "gpt-5.4", content: "Создаю Telegram-бота на python-telegram-bot v20 с async-архитектурой...\n\n```python\nfrom telegram import Update\nfrom telegram.ext import Application, MessageHandler, filters\n\nasync def handle_message(update: Update, context):\n    query = update.message.text\n    # RAG pipeline\n    docs = retriever.get_relevant_documents(query)\n    context_text = \"\\n\".join([d.page_content for d in docs[:3]])\n    response = await llm.agenerate(f\"{context_text}\\n\\nВопрос: {query}\")\n    await update.message.reply_text(response)\n```\n\n⏳ Продолжаю генерацию полного кода...", timestamp: "10:32", tokens: { in: 1560, out: 2400 }, cost: 0.91 },
        ],
      },
    ],
  },
  {
    id: "p3",
    name: "Аналитика продаж",
    createdAt: "2026-04-01",
    budget: 2.00,
    tasks: [
      {
        id: "t7", name: "Дашборд в Metabase", status: "done",
        cost: 0.67, duration: "5m 22s", model: "gemini-3.1-pro", createdAt: "2026-04-01",
        messages: [
          { id: "m13", role: "user", content: "Создай SQL-запросы для дашборда продаж в Metabase: выручка по месяцам, топ-10 товаров, конверсия воронки.", timestamp: "13:00" },
          { id: "m14", role: "assistant", model: "gemini-3.1-pro", content: "## SQL-запросы для дашборда продаж\n\n**Выручка по месяцам:**\n```sql\nSELECT DATE_TRUNC('month', created_at) as month,\n       SUM(total_amount) as revenue,\n       COUNT(*) as orders\nFROM orders WHERE status = 'completed'\nGROUP BY 1 ORDER BY 1;\n```\n\n**Топ-10 товаров:**\n```sql\nSELECT p.name, SUM(oi.quantity) as sold, SUM(oi.price * oi.quantity) as revenue\nFROM order_items oi JOIN products p ON p.id = oi.product_id\nGROUP BY p.id, p.name ORDER BY revenue DESC LIMIT 10;\n```\n\n✅ Все 3 запроса готовы к импорту в Metabase.", timestamp: "13:05", tokens: { in: 780, out: 2200 }, cost: 0.67 },
        ],
      },
    ],
  },
];

// ── Mock Race History ──────────────────────────────────────────────────────
export const MOCK_RACES: Race[] = [
  {
    id: "r1", task: "Напиши REST API на FastAPI с JWT авторизацией", category: "backend",
    timestamp: "2026-04-02T10:30:00Z",
    runners: [
      { modelId: "claude-sonnet-4.6", time: 4.2, cost: 0.089, tokensIn: 820, tokensOut: 2800, score: 9, output: "Реализован REST API с JWT авторизацией, refresh tokens, rate limiting через slowapi. Покрытие тестами 91%. OpenAPI-спека автогенерируется." },
      { modelId: "gpt-5.4",           time: 3.8, cost: 0.112, tokensIn: 820, tokensOut: 2600, score: 8, output: "FastAPI приложение с OAuth2PasswordBearer, bcrypt хешированием паролей, middleware для логирования. Dockerfile включён." },
      { modelId: "deepseek-v3.2",     time: 6.1, cost: 0.008, tokensIn: 820, tokensOut: 2900, score: 7, output: "Полная реализация с JWT, RBAC ролями, PostgreSQL через SQLAlchemy async. Самое дешёвое решение." },
    ],
  },
  {
    id: "r2", task: "Создай landing page для SaaS продукта", category: "design",
    timestamp: "2026-04-02T14:15:00Z",
    runners: [
      { modelId: "claude-opus-4.6",   time: 7.3, cost: 0.245, tokensIn: 1100, tokensOut: 4200, score: 10, output: "Hero-секция с gradient mesh, анимированной типографикой, социальными доказательствами. Lighthouse 97/100. Container queries для адаптива." },
      { modelId: "gpt-5.4",           time: 5.9, cost: 0.198, tokensIn: 1100, tokensOut: 3800, score: 8,  output: "Чистый дизайн с CTA, pricing таблицей, FAQ accordion. Tailwind CSS, полностью адаптивный." },
      { modelId: "gemini-3.1-pro",    time: 4.4, cost: 0.076, tokensIn: 1100, tokensOut: 2900, score: 7,  output: "Минималистичный лендинг с hero, features grid и contact формой. Быстрее всех, но менее детальный." },
    ],
  },
  {
    id: "r3", task: "Code review: найди уязвимости в Python коде", category: "review",
    timestamp: "2026-04-03T09:00:00Z",
    runners: [
      { modelId: "claude-sonnet-4.6", time: 3.1, cost: 0.067, tokensIn: 950, tokensOut: 2100, score: 9, output: "Найдено 5 уязвимостей: SQL injection, XSS, IDOR, отсутствие CSRF, небезопасная десериализация. Каждая с PoC и патчем." },
      { modelId: "deepseek-r2",       time: 5.8, cost: 0.019, tokensIn: 950, tokensOut: 3100, score: 8, output: "Детальный анализ с CVSS оценками. Найдено 4 критических и 3 средних уязвимости. Рекомендации по архитектуре." },
    ],
  },
];

// ── Dashboard mock data ────────────────────────────────────────────────────
export const DASHBOARD_DAILY = [
  { date: "28 мар", cost: 1.2, tasks: 3 },
  { date: "29 мар", cost: 2.8, tasks: 7 },
  { date: "30 мар", cost: 1.9, tasks: 5 },
  { date: "31 мар", cost: 4.1, tasks: 11 },
  { date: "1 апр",  cost: 3.3, tasks: 8 },
  { date: "2 апр",  cost: 5.7, tasks: 14 },
  { date: "3 апр",  cost: 2.4, tasks: 6 },
];

export const DASHBOARD_MODELS = [
  { name: "Claude Sonnet", cost: 4.82, tasks: 18 },
  { name: "GPT-5.4",       cost: 3.41, tasks: 12 },
  { name: "Claude Opus",   cost: 3.13, tasks: 5  },
  { name: "DeepSeek V3",   cost: 0.89, tasks: 9  },
  { name: "Gemini Pro",    cost: 0.67, tasks: 7  },
  { name: "Haiku",         cost: 0.38, tasks: 3  },
];

export const DASHBOARD_PROJECTS = [
  { name: "Bitrix Landing",     cost: 2.28 },
  { name: "AI Чат-бот",         cost: 3.78 },
  { name: "Аналитика продаж",   cost: 0.67 },
  { name: "Dog Racing",         cost: 0.72 },
];

// ── Users mock data ────────────────────────────────────────────────────────
export const MOCK_USERS = [
  { id: "u1", name: "Алексей Петров",  email: "alex@company.ru",  role: "super_admin", status: "active",  budget: null,  spent: 21.4 },
  { id: "u2", name: "Мария Сидорова",  email: "maria@company.ru", role: "manager",     status: "active",  budget: 50,    spent: 12.8 },
  { id: "u3", name: "Дмитрий Козлов",  email: "dmitry@company.ru",role: "user",        status: "active",  budget: 20,    spent: 8.3  },
  { id: "u4", name: "Анна Новикова",   email: "anna@company.ru",  role: "user",        status: "active",  budget: 20,    spent: 3.1  },
  { id: "u5", name: "Сергей Волков",   email: "sergey@company.ru",role: "user",        status: "blocked", budget: 10,    spent: 9.9  },
];

// ── Admin / Access Control Types ─────────────────────────────────────────────

export type UserRole = "super_admin" | "admin" | "group_manager" | "user";
export type UserStatus = "active" | "blocked" | "pending";
export type BudgetPeriod = "day" | "week" | "month" | "total";
export type BudgetAction = "warn" | "block" | "notify_admin";
export type TaskVisibility = "own" | "group" | "all";

export interface Permission {
  // Task visibility
  taskVisibility: TaskVisibility;
  // Section access
  canViewAnalytics: boolean;
  canViewModels: boolean;
  canViewLogs: boolean;
  canViewBudgets: boolean;
  canManageBudgets: boolean;
  canViewConsolidation: boolean;
  canViewDogRacing: boolean;
  canViewAdminPanel: boolean;
  // Model restrictions
  allowedModelIds: string[] | null;    // null = all allowed
  blockedModelIds: string[];
  allowedModes: string[] | null;       // null = all allowed
}

export interface BudgetLimit {
  amount: number;
  period: BudgetPeriod;
  alertThreshold: number;   // 0-100 percent
  actionOnExceed: BudgetAction;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  groupId: string | null;
  avatarInitials: string;
  avatarColor: string;
  createdAt: string;
  lastActiveAt: string;
  budget: BudgetLimit | null;
  spent: number;
  permissions: Permission;
}

export interface AdminGroup {
  id: string;
  name: string;
  description: string;
  managerId: string | null;
  memberIds: string[];
  budget: BudgetLimit | null;
  spent: number;
  color: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  projectId: string;
  projectName: string;
  taskId: string;
  taskName: string;
  model: string;
  mode: string;
  agents: string[];
  cost: number;
  tokensIn: number;
  tokensOut: number;
  status: TaskStatus;
  timestamp: string; // ISO
}

// ── Default permissions per role ─────────────────────────────────────────────
export const DEFAULT_PERMISSIONS: Record<UserRole, Permission> = {
  super_admin: {
    taskVisibility: "all",
    canViewAnalytics: true,
    canViewModels: true,
    canViewLogs: true,
    canViewBudgets: true,
    canManageBudgets: true,
    canViewConsolidation: true,
    canViewDogRacing: true,
    canViewAdminPanel: true,
    allowedModelIds: null,
    blockedModelIds: [],
    allowedModes: null,
  },
  admin: {
    taskVisibility: "all",
    canViewAnalytics: true,
    canViewModels: true,
    canViewLogs: true,
    canViewBudgets: true,
    canManageBudgets: true,
    canViewConsolidation: true,
    canViewDogRacing: true,
    canViewAdminPanel: true,
    allowedModelIds: null,
    blockedModelIds: [],
    allowedModes: null,
  },
  group_manager: {
    taskVisibility: "group",
    canViewAnalytics: true,
    canViewModels: true,
    canViewLogs: false,
    canViewBudgets: true,
    canManageBudgets: false,
    canViewConsolidation: true,
    canViewDogRacing: true,
    canViewAdminPanel: false,
    allowedModelIds: null,
    blockedModelIds: [],
    allowedModes: null,
  },
  user: {
    taskVisibility: "own",
    canViewAnalytics: false,
    canViewModels: true,
    canViewLogs: false,
    canViewBudgets: false,
    canManageBudgets: false,
    canViewConsolidation: false,
    canViewDogRacing: false,
    canViewAdminPanel: false,
    allowedModelIds: null,
    blockedModelIds: [],
    allowedModes: null,
  },
};

// ── Mock Admin Users ──────────────────────────────────────────────────────────
export const ADMIN_USERS: AdminUser[] = [
  {
    id: "u1", name: "Алексей Петров", email: "alex@company.ru",
    role: "super_admin", status: "active", groupId: null,
    avatarInitials: "АП", avatarColor: "#3B82F6",
    createdAt: "2026-01-01", lastActiveAt: "2026-04-04T10:00:00Z",
    budget: null, spent: 21.4,
    permissions: { ...DEFAULT_PERMISSIONS.super_admin },
  },
  {
    id: "u2", name: "Мария Сидорова", email: "maria@company.ru",
    role: "admin", status: "active", groupId: "g1",
    avatarInitials: "МС", avatarColor: "#8B5CF6",
    createdAt: "2026-01-15", lastActiveAt: "2026-04-04T09:30:00Z",
    budget: { amount: 100, period: "month", alertThreshold: 80, actionOnExceed: "warn" },
    spent: 12.8,
    permissions: { ...DEFAULT_PERMISSIONS.admin },
  },
  {
    id: "u3", name: "Дмитрий Козлов", email: "dmitry@company.ru",
    role: "group_manager", status: "active", groupId: "g1",
    avatarInitials: "ДК", avatarColor: "#10B981",
    createdAt: "2026-02-01", lastActiveAt: "2026-04-03T18:00:00Z",
    budget: { amount: 50, period: "month", alertThreshold: 75, actionOnExceed: "warn" },
    spent: 8.3,
    permissions: { ...DEFAULT_PERMISSIONS.group_manager },
  },
  {
    id: "u4", name: "Анна Новикова", email: "anna@company.ru",
    role: "user", status: "active", groupId: "g1",
    avatarInitials: "АН", avatarColor: "#F59E0B",
    createdAt: "2026-02-10", lastActiveAt: "2026-04-04T08:15:00Z",
    budget: { amount: 20, period: "month", alertThreshold: 80, actionOnExceed: "block" },
    spent: 3.1,
    permissions: {
      ...DEFAULT_PERMISSIONS.user,
      taskVisibility: "group",
      canViewAnalytics: true,
      allowedModelIds: ["claude-sonnet-4.6", "claude-haiku-4.5", "gpt-5.4-mini", "deepseek-v3.2"],
      allowedModes: ["auto", "optimum", "light", "normal"],
    },
  },
  {
    id: "u5", name: "Сергей Волков", email: "sergey@company.ru",
    role: "user", status: "blocked", groupId: "g2",
    avatarInitials: "СВ", avatarColor: "#EF4444",
    createdAt: "2026-02-15", lastActiveAt: "2026-04-01T12:00:00Z",
    budget: { amount: 10, period: "month", alertThreshold: 90, actionOnExceed: "block" },
    spent: 9.9,
    permissions: { ...DEFAULT_PERMISSIONS.user },
  },
  {
    id: "u6", name: "Ирина Лебедева", email: "irina@company.ru",
    role: "user", status: "active", groupId: "g2",
    avatarInitials: "ИЛ", avatarColor: "#06B6D4",
    createdAt: "2026-03-01", lastActiveAt: "2026-04-04T07:45:00Z",
    budget: { amount: 30, period: "month", alertThreshold: 80, actionOnExceed: "notify_admin" },
    spent: 5.6,
    permissions: {
      ...DEFAULT_PERMISSIONS.user,
      canViewAnalytics: true,
      allowedModes: ["auto", "optimum", "light", "normal", "free"],
    },
  },
  {
    id: "u7", name: "Павел Морозов", email: "pavel@company.ru",
    role: "user", status: "active", groupId: "g2",
    avatarInitials: "ПМ", avatarColor: "#84CC16",
    createdAt: "2026-03-10", lastActiveAt: "2026-04-03T16:30:00Z",
    budget: { amount: 15, period: "month", alertThreshold: 70, actionOnExceed: "warn" },
    spent: 2.1,
    permissions: { ...DEFAULT_PERMISSIONS.user },
  },
];

// ── Mock Admin Groups ─────────────────────────────────────────────────────────
export const ADMIN_GROUPS: AdminGroup[] = [
  {
    id: "g1", name: "Разработка", description: "Backend и Frontend разработчики",
    managerId: "u3", memberIds: ["u2", "u3", "u4"],
    budget: { amount: 200, period: "month", alertThreshold: 80, actionOnExceed: "warn" },
    spent: 24.2, color: "#3B82F6",
  },
  {
    id: "g2", name: "Маркетинг", description: "Контент, SEO, реклама",
    managerId: null, memberIds: ["u5", "u6", "u7"],
    budget: { amount: 100, period: "month", alertThreshold: 75, actionOnExceed: "notify_admin" },
    spent: 17.6, color: "#8B5CF6",
  },
];

// ── Mock Audit Logs ───────────────────────────────────────────────────────────
export const AUDIT_LOGS: AuditLogEntry[] = [
  {
    id: "log1", userId: "u1", userName: "Алексей Петров", userRole: "super_admin",
    projectId: "p1", projectName: "Bitrix Landing", taskId: "t1", taskName: "Установка Bitrix на сервер",
    model: "claude-sonnet-4.6", mode: "optimum", agents: ["planner", "coder"],
    cost: 1.24, tokensIn: 1240, tokensOut: 3850, status: "done",
    timestamp: "2026-04-01T10:04:00Z",
  },
  {
    id: "log2", userId: "u1", userName: "Алексей Петров", userRole: "super_admin",
    projectId: "p1", projectName: "Bitrix Landing", taskId: "t2", taskName: "Настройка SSL сертификата",
    model: "claude-haiku-4.5", mode: "light", agents: ["coder"],
    cost: 0.38, tokensIn: 420, tokensOut: 1100, status: "done",
    timestamp: "2026-04-01T11:02:00Z",
  },
  {
    id: "log3", userId: "u3", userName: "Дмитрий Козлов", userRole: "group_manager",
    projectId: "p1", projectName: "Bitrix Landing", taskId: "t3", taskName: "Оптимизация скорости загрузки",
    model: "gpt-5.4-mini", mode: "auto", agents: ["analyst", "coder"],
    cost: 0.12, tokensIn: 380, tokensOut: 290, status: "error",
    timestamp: "2026-04-02T14:01:00Z",
  },
  {
    id: "log4", userId: "u4", userName: "Анна Новикова", userRole: "user",
    projectId: "p1", projectName: "Bitrix Landing", taskId: "t4", taskName: "Настройка резервного копирования",
    model: "deepseek-v3.2", mode: "optimum", agents: ["coder", "reviewer"],
    cost: 0.54, tokensIn: 890, tokensOut: 2100, status: "warning",
    timestamp: "2026-04-02T15:03:00Z",
  },
  {
    id: "log5", userId: "u1", userName: "Алексей Петров", userRole: "super_admin",
    projectId: "p2", projectName: "AI Чат-бот для клиентов", taskId: "t5", taskName: "Архитектура RAG-системы",
    model: "claude-opus-4.6", mode: "top", agents: ["orchestrator", "planner", "coder", "reviewer", "researcher"],
    cost: 2.87, tokensIn: 2100, tokensOut: 5800, status: "done",
    timestamp: "2026-04-02T09:08:00Z",
  },
  {
    id: "log6", userId: "u2", userName: "Мария Сидорова", userRole: "admin",
    projectId: "p2", projectName: "AI Чат-бот для клиентов", taskId: "t6", taskName: "Интеграция с Telegram",
    model: "gpt-5.4", mode: "auto", agents: ["orchestrator", "coder", "researcher"],
    cost: 0.91, tokensIn: 1560, tokensOut: 2400, status: "running",
    timestamp: "2026-04-03T10:32:00Z",
  },
  {
    id: "log7", userId: "u3", userName: "Дмитрий Козлов", userRole: "group_manager",
    projectId: "p3", projectName: "Аналитика продаж", taskId: "t7", taskName: "Дашборд в Metabase",
    model: "gemini-3.1-pro", mode: "optimum", agents: ["analyst", "coder"],
    cost: 0.67, tokensIn: 780, tokensOut: 2200, status: "done",
    timestamp: "2026-04-01T13:05:00Z",
  },
  {
    id: "log8", userId: "u6", userName: "Ирина Лебедева", userRole: "user",
    projectId: "p3", projectName: "Аналитика продаж", taskId: "t8", taskName: "Прогноз продаж на Q2",
    model: "deepseek-v3.2", mode: "light", agents: ["analyst"],
    cost: 0.34, tokensIn: 560, tokensOut: 1400, status: "done",
    timestamp: "2026-04-03T14:20:00Z",
  },
  {
    id: "log9", userId: "u7", userName: "Павел Морозов", userRole: "user",
    projectId: "p2", projectName: "AI Чат-бот для клиентов", taskId: "t9", taskName: "Тестирование чат-бота",
    model: "claude-haiku-4.5", mode: "normal", agents: ["tester"],
    cost: 0.18, tokensIn: 340, tokensOut: 890, status: "done",
    timestamp: "2026-04-03T16:45:00Z",
  },
  {
    id: "log10", userId: "u5", userName: "Сергей Волков", userRole: "user",
    projectId: "p1", projectName: "Bitrix Landing", taskId: "t10", taskName: "SEO оптимизация",
    model: "gpt-5.4-mini", mode: "free", agents: ["writer"],
    cost: 0.09, tokensIn: 290, tokensOut: 720, status: "done",
    timestamp: "2026-04-01T09:15:00Z",
  },
];

// ── Org-level budget ──────────────────────────────────────────────────────────
export const ORG_BUDGET: BudgetLimit & { name: string; spent: number } = {
  name: "Arcane AI — Организация",
  amount: 500,
  period: "month",
  alertThreshold: 80,
  actionOnExceed: "notify_admin",
  spent: 62.8,
};
