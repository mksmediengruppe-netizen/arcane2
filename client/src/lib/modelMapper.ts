/**
 * ARCANE 2 — Model Mapper
 * ========================
 * Converts backend ModelSpec (from GET /api/models) to frontend display format.
 * The backend has 25 LLM + 7 image models, frontend needs display fields like
 * color, icon, tier, superpower, transport.
 */

import type { BackendLLMModel } from './api';

// Unified model type for mapper (works with both backend and frontend models)
type ModelInfo = BackendLLMModel & {
  // optional frontend-only fields
  costIn?: number;
  costOut?: number;
  display_name?: string;
  color?: string;
  icon?: string;
  tier?: string;
  speed?: string;
  provider?: string;
};

// ── Provider colors & icons ──────────────────────────────────────────────────

const PROVIDER_CONFIG: Record<string, { color: string; icon: string }> = {
  anthropic: { color: '#D4A574', icon: '◇' },
  openai:    { color: '#C4A7E7', icon: '●' },
  google:    { color: '#F2C078', icon: '✦' },
  deepseek:  { color: '#82C9A5', icon: '◆' },
  meta:      { color: '#6B9BF2', icon: '▣' },
  mistral:   { color: '#E09F7D', icon: '■' },
  nvidia:    { color: '#76B900', icon: '⬡' },
  moonshot:  { color: '#78C8E0', icon: '☽' },
  stepfun:   { color: '#90C8A0', icon: '→' },
  minimax:   { color: '#E09F7D', icon: '■' },
  default:   { color: '#999999', icon: '○' },
};

// ── Tier classification ──────────────────────────────────────────────────────

function classifyTier(model: ModelInfo): string {
  const price = model.input_price ?? model.costIn ?? 0;
  const outPrice = model.output_price ?? model.costOut ?? 0;

  if (price === 0 && outPrice === 0) return 'free';
  if (price >= 4 || outPrice >= 20) return 'genius';
  if (price >= 1.5 || outPrice >= 10) return 'standard';
  if (price >= 0.5) return 'fast';
  if (price >= 0.2) return 'optimum';
  return 'fast';
}

// ── Superpower descriptions ──────────────────────────────────────────────────

const SUPERPOWERS: Record<string, string> = {
  'claude-opus-4.6': 'Deep reasoning, архитектура',
  'claude-sonnet-4.6': 'Frontend/дизайн #1',
  'claude-haiku-4.5': 'Быстрый, vision',
  'gpt-5.4': 'Code audit #1',
  'gpt-5.4-mini': 'Планирование',
  'gpt-5.4-nano': 'Классификация',
  'gemini-3.1-pro': 'SWE #1, код',
  'gemini-2.5-flash': 'Оркестратор',
  'deepseek-v3.2': 'Дешёвый код',
  'o3': 'Deep reasoning',
  'o4-mini': 'Reasoning, fast',
};

// ── Main mapper ──────────────────────────────────────────────────────────────

export interface DisplayModel {
  id: string;
  name: string;
  provider: string;
  color: string;
  icon: string;
  costIn: number;    // $/M input tokens
  costOut: number;   // $/M output tokens
  tier: string;
  isFree: boolean;
  context: number | null;  // in K tokens (e.g. 200 for 200K)
  swe: number | null;
  superpower: string;
  transport: 'native' | 'openrouter';
}

export function mapBackendModel(m: ModelInfo): DisplayModel {
  // Extract provider from openrouter_id or native_provider
  const orId = (m as any).openrouter_id || '';
  const providerRaw = orId.split('/')[0] || (m as any).native_provider || m.provider || 'unknown';
  const provider = providerRaw.replace('_native', '').toLowerCase();
  
  const config = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.default;
  
  // Use existing frontend fields if present, otherwise map from backend
  const costIn = m.costIn ?? m.input_price ?? 0;
  const costOut = m.costOut ?? m.output_price ?? 0;
  
  // Context: backend stores raw number (200000), frontend wants K (200)
  const rawContext = m.max_context || 0;
  const contextK = rawContext >= 1000 ? Math.round(rawContext / 1000) : rawContext;
  
  return {
    id: m.id,
    name: m.display_name || m.name || m.id,
    provider: provider.charAt(0).toUpperCase() + provider.slice(1),
    color: m.color || config.color,
    icon: m.icon || config.icon,
    costIn,
    costOut,
    tier: m.tier || classifyTier(m),
    isFree: m.is_free || (costIn === 0 && costOut === 0),
    context: contextK || null,
    swe: m.swe_bench ?? (m as any).swe ?? null,
    superpower: (m as any).superpower || SUPERPOWERS[m.id] || m.speed || '',
    transport: (m as any).native_id ? 'native' : 'openrouter',
  };
}

export function mapBackendModels(models: ModelInfo[]): DisplayModel[] {
  return models.map(mapBackendModel);
}

// ── Tier config for UI ───────────────────────────────────────────────────────

export const TIER_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  genius:   { label: 'Флагман',  color: '#D4A574', bg: 'rgba(212,165,116,0.12)' },
  standard: { label: 'Стандарт', color: '#7EB8DA', bg: 'rgba(126,184,218,0.12)' },
  optimum:  { label: 'Оптимум',  color: '#82C9A5', bg: 'rgba(130,201,165,0.12)' },
  fast:     { label: 'Быстрый',  color: '#E8D5A3', bg: 'rgba(232,213,163,0.12)' },
  free:     { label: 'Free',     color: '#76B900', bg: 'rgba(118,185,0,0.12)' },
};

// ── Chat modes (spec §6.1) ───────────────────────────────────────────────────

export const CHAT_MODES = [
  { id: 'auto',       label: 'AUTO',              icon: '⚡', desc: 'Система сама выбирает модель по задаче, сложности и бюджету' },
  { id: 'top',        label: 'ТОП',               icon: '🏆', desc: 'Лучшая модель для каждой роли, оптимально по цене' },
  { id: 'optimum',    label: 'ОПТИМУМ',           icon: '⚖️', desc: '90% качества ТОП за 50% цены. Default.' },
  { id: 'lite',       label: 'ЛАЙТ',              icon: '🪶', desc: 'Приемлемое качество за минимальную стоимость' },
  { id: 'free',       label: 'БЕСПЛАТНО',         icon: '🆓', desc: '$0 за AI. Только Free модели' },
  { id: 'manual',     label: 'MANUAL',            icon: '🎛️', desc: 'Вы выбираете модель для каждой роли' },
  { id: 'normal',     label: 'Обычный',           icon: '💬', desc: 'Стандартный режим' },
  { id: 'collective', label: 'Коллективный разум', icon: '🧠', desc: '2–5 моделей → консолидированный ответ' },
];

// ── Agent roles ──────────────────────────────────────────────────────────────

export const AGENT_ROLES = [
  { id: 'orchestrator', label: 'Оркестратор', defaultModel: 'gemini-2.5-flash' },
  { id: 'planner',      label: 'Планировщик', defaultModel: 'gpt-5.4-mini' },
  { id: 'coder',        label: 'Кодер',       defaultModel: 'claude-sonnet-4.6' },
  { id: 'reviewer',     label: 'Ревьюер',     defaultModel: 'gpt-5.4' },
  { id: 'researcher',   label: 'Исследователь', defaultModel: 'gemini-3.1-pro' },
  { id: 'writer',       label: 'Писатель',    defaultModel: 'claude-sonnet-4.6' },
  { id: 'analyst',      label: 'Аналитик',    defaultModel: 'gpt-5.4' },
  { id: 'tester',       label: 'Тестер',      defaultModel: 'gemini-2.5-flash' },
];
