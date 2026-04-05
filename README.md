# ARCANE 2

Автономное AI-агентство. 25 LLM-моделей, 6 режимов работы, SSH/браузер/файловые инструменты, мультимодельное сравнение.

## Архитектура

```
User Request
    │
    ▼
┌─────────────────────────────────────────────────┐
│  API Server (FastAPI, порт 8900)                │
│  api/api.py — 14 REST endpoints + WebSocket     │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│  Orchestrator (core/orchestrator.py)            │
│                                                 │
│  1. Intent Classifier (LLM) → тип + сложность  │
│  2. Preset Manager → команда моделей по режиму  │
│  3. Agent Loop → итеративное выполнение         │
│  4. Budget Controller → отслеживание расходов   │
│  5. Project Manager → обновление состояния      │
└──────────────────────┬──────────────────────────┘
                       │
           ┌───────────┼───────────┐
           ▼           ▼           ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐
     │ Tool     │ │ SSH      │ │ Browser  │
     │ Executor │ │ Tools    │ │ Worker   │
     │ files,   │ │ 10 cmds  │ │Playwright│
     │ shell,   │ │ backup,  │ │ navigate │
     │ search   │ │ patch    │ │ click    │
     └──────────┘ └──────────┘ └──────────┘
           │
           ▼
     ┌──────────┐
     │ LLM      │
     │ Client   │──→ OpenRouter API ──→ 25 моделей
     │ (tools + │
     │  chat)   │
     └──────────┘
```

## Модули

| Модуль | Файл | Строк | Что делает |
|--------|------|-------|------------|
| **API** | `api/api.py` | 570 | FastAPI сервер, 14 endpoints, WebSocket |
| **Orchestrator** | `core/orchestrator.py` | 700 | Центральный движок: classify → recommend → execute |
| **Agent Loop** | `core/agent_loop.py` | 1218 | Итеративное выполнение с tool use (до 25 итераций) |
| **Intent Classifier** | `core/intent_classifier.py` | 758 | 12 типов задач, LLM + keyword fallback |
| **Tool Executor** | `core/tool_executor.py` | 370 | Диспетчер: files, shell, SSH, image, search |
| **Tool Registry** | `core/tool_registry.py` | 311 | 19 tool schemas в OpenAI function-calling формате |
| **Budget Controller** | `core/budget_controller.py` | 1141 | Пороги 80/95/100%, pre_check, record, downgrade |
| **Project Manager** | `core/project_manager.py` | 1456 | Structured state, PROJECT.md генерация |
| **Security** | `core/security.py` | 1330 | ApprovalGate, AuditLog, PII scanner |
| **Consolidation** | `core/consolidation.py` | 1055 | Мульти-LLM опрос + консолидация |
| **Model Registry** | `shared/llm/model_registry.py` | 813 | 25 LLM + 7 image gen, цены, capabilities |
| **Preset Manager** | `shared/llm/preset_manager.py` | 656 | 6 режимов: AUTO/MANUAL/TOP/OPTIMUM/LITE/FREE |
| **LLM Client** | `shared/llm/llm_client.py` | 236 | OpenRouter API, function calling, tool_calls |
| **Router** | `shared/llm/router.py` | 612 | Tier escalation, fallback chains, budget gates |
| **SSH Tools** | `workers/ssh_tools.py` | 1300 | 10 SSH-инструментов, auto-backup, audit |
| **Image Gen** | `workers/image_gen.py` | 1587 | Flux, Midjourney, Ideogram, Recraft, Pexels |
| **Auto Documenter** | `workers/auto_documenter.py` | 1534 | Фоновое обновление ARCHITECTURE.md |
| **Memory v9** | `shared/memory_v9/` | 3200+ | 17 подмодулей: learning, semantic, graph |

**Итого:** 67 Python файлов, ~25,700 строк.

## Модели

### LLM (25 моделей через OpenRouter)

| Модель | $/M In/Out | Роль |
|--------|-----------|------|
| Claude Opus 4.6 | $5/$25 | Deep reasoning, архитектура |
| Claude Sonnet 4.6 | $3/$15 | Frontend/дизайн, основной coder |
| Claude Haiku 4.5 | $1/$5 | Быстрый, vision |
| GPT-5.4 | $2.50/$15 | Code audit, backend |
| GPT-5.4-mini | $0.75/$4.50 | Планирование |
| GPT-5.4-nano | $0.20/$1.25 | Классификация (intent) |
| Gemini 3.1 Pro | $2/$12 | SWE #1 |
| Gemini 2.5 Flash | $0.30/$2.50 | Оркестратор, консолидатор |
| DeepSeek V3.2 | $0.28/$0.42 | Дешёвый код |
| + 16 других | free-$2 | Специализированные |

### Image Gen (7 моделей)
Flux 2 Pro, Midjourney V8, Ideogram V3, Recraft V4, Flux Schnell, GPT Image, Pexels.

## 6 режимов

| Режим | Описание | Classifier | Coder |
|-------|----------|-----------|-------|
| **AUTO** | По лидерборду | nano | по данным dog racing |
| **MANUAL** | Пользователь выбирает | выбор | выбор |
| **TOP** | Лучшие модели | flash | genius (GPT-5.4) |
| **OPTIMUM** | 90% качества, 50% цены (default) | nano | standard (Sonnet) |
| **LITE** | Минимум | nano | fast (DeepSeek) |
| **FREE** | $0 | nano | nano |

## API

```bash
# Создать проект
curl -X POST http://localhost:8900/api/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"Кофейня","goal":"Лендинг"}'

# Отправить задачу
curl -X POST http://localhost:8900/api/projects/{id}/tasks \
  -H "Content-Type: application/json" \
  -d '{"task":"создай лендинг для кофейни","mode":"optimum"}'

# Dog Racing — сравнить модели
curl -X POST http://localhost:8900/api/dog-racing \
  -H "Content-Type: application/json" \
  -d '{"task":"What is 2+2?","models":["gpt-5.4-nano","gemini-2.5-flash"]}'

# Consolidation — мульти-LLM консенсус
curl -X POST http://localhost:8900/api/consolidation \
  -H "Content-Type: application/json" \
  -d '{"task":"Best REST API practices","models":["gpt-5.4-nano","gemini-2.5-flash"]}'

# Бюджет
curl http://localhost:8900/api/budget
curl http://localhost:8900/api/budget/{project_id}

# Модели
curl http://localhost:8900/api/models

# Health
curl http://localhost:8900/api/health
```

## Установка

```bash
# Клонировать
git clone https://github.com/mksmediengruppe-netizen/arcane2.git
cd arcane2

# Настроить
cp .env.example .env
# Отредактировать .env: OPENROUTER_API_KEY, TAVILY_API_KEY

# Зависимости
pip install -r requirements.txt

# Запуск
python api/api.py
# или через systemd:
# cp etc/arcane2.service /etc/systemd/system/
# systemctl enable --now arcane2
```

## Структура проекта

```
arcane2/
├── api/
│   ├── api.py              ← HTTP API server
│   └── chat_store.py       ← Chat storage (in-memory stub)
├── core/
│   ├── orchestrator.py     ← Central engine
│   ├── agent_loop.py       ← Iterative agent with tools
│   ├── intent_classifier.py← Task classification (12 types)
│   ├── tool_registry.py    ← Tool schemas
│   ├── tool_executor.py    ← Tool dispatcher
│   ├── budget_controller.py← Cost tracking + limits
│   ├── project_manager.py  ← Project state management
│   ├── security.py         ← Approval gates, audit, PII
│   ├── consolidation.py    ← Multi-LLM consolidation
│   ├── golden_paths.py     ← Reusable solution patterns
│   ├── sandbox.py          ← Docker/su-based isolation
│   └── context_manager.py  ← Scratchpad, context compaction
├── shared/
│   ├── llm/
│   │   ├── model_registry.py ← 25 LLM + 7 image models
│   │   ├── preset_manager.py ← 6 operational modes
│   │   ├── llm_client.py     ← OpenRouter API client
│   │   ├── router.py         ← Model routing + escalation
│   │   ├── client.py         ← Compat shim
│   │   └── provider_adapters.py ← Native API adapters
│   ├── memory_v9/           ← 17 memory modules
│   └── models/
│       ├── schemas.py       ← Pydantic models
│       └── arcane2_schemas.py ← v2 model specs
├── workers/
│   ├── ssh_tools.py         ← 10 SSH commands
│   ├── ssh/worker.py        ← SSH worker
│   ├── browser/worker.py    ← Playwright browser
│   ├── image_gen.py         ← 7 image providers
│   └── auto_documenter.py   ← Auto ARCHITECTURE.md
├── frontend/                ← React UI
├── config/settings.py       ← Configuration
├── requirements.txt
└── .env.example
```

## Переменные окружения

```env
OPENROUTER_API_KEY=sk-or-v1-...    # Обязательно
TAVILY_API_KEY=tvly-...             # Для web_search
ARCANE_PORT=8900                    # HTTP порт
ARCANE_WORKSPACE=/root/workspace    # Директория проектов
ARCANE_CLASSIFIER_MODEL=gpt-5.4-nano  # Модель для классификации
```

## Лицензия

Proprietary. MKS Mediengruppe / Netizen.
