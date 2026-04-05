"""
ARCANE 2 — Model Registry v2
Verified against OpenRouter API: April 2, 2026
All model IDs, prices and capabilities confirmed via live API call.
"""

from __future__ import annotations

from shared.models.arcane2_schemas import (
    ModelSpec, ImageModelSpec, ManusSpec,
    ToolCallReliability, ModelCategory, Provider,
)


# ═══════════════════════════════════════════════════════════════════════════════
# LLM MODELS — verified via OpenRouter API 2026-04-02
# ═══════════════════════════════════════════════════════════════════════════════

MODELS: dict[str, ModelSpec] = {

    # ── Anthropic ─────────────────────────────────────────────────────────────

    "claude-opus-4.6": ModelSpec(
        id="claude-opus-4.6",
        display_name="Claude Opus 4.6",
        input_price=5.00, output_price=25.00, cached_input_price=0.50,
        max_context=200_000, max_output=128_000,
        supports_vision=True,
        tool_calling=ToolCallReliability.RELIABLE,
        categories=[ModelCategory.REASONING, ModelCategory.CODE],
        swe_bench=80.8, speed="slow",
        openrouter_id="anthropic/claude-opus-4.6",
        native_id="claude-opus-4-6", native_provider=Provider.ANTHROPIC_NATIVE,
        is_reasoning=True,
    ),

    "claude-sonnet-4.6": ModelSpec(
        id="claude-sonnet-4.6",
        display_name="Claude Sonnet 4.6",
        input_price=3.00, output_price=15.00, cached_input_price=0.30,
        max_context=200_000, max_output=64_000,
        supports_vision=True,
        tool_calling=ToolCallReliability.RELIABLE,
        categories=[ModelCategory.DESIGN, ModelCategory.CODE],
        swe_bench=79.6, speed="medium",
        openrouter_id="anthropic/claude-sonnet-4.6",
        native_id="claude-sonnet-4-6", native_provider=Provider.ANTHROPIC_NATIVE,
    ),

    "claude-haiku-4.5": ModelSpec(
        id="claude-haiku-4.5",
        display_name="Claude Haiku 4.5",
        input_price=1.00, output_price=5.00, cached_input_price=0.10,
        max_context=200_000, max_output=8_000,
        supports_vision=True,
        tool_calling=ToolCallReliability.RELIABLE,
        categories=[ModelCategory.FAST],
        speed="fast",
        openrouter_id="anthropic/claude-haiku-4.5",
        native_id="claude-haiku-4-5-20251001", native_provider=Provider.ANTHROPIC_NATIVE,
    ),

    # ── OpenAI ────────────────────────────────────────────────────────────────

    "gpt-5.4": ModelSpec(
        id="gpt-5.4",
        display_name="GPT-5.4",
        input_price=2.50, output_price=15.00, cached_input_price=0.625,
        max_context=1_047_576, max_output=128_000,
        supports_vision=True,
        tool_calling=ToolCallReliability.RELIABLE,
        categories=[ModelCategory.CODE],
        swe_bench=80.0, speed="medium",
        openrouter_id="openai/gpt-5.4",
        native_id="gpt-5.4", native_provider=Provider.OPENAI_NATIVE,
    ),

    "gpt-5.4-mini": ModelSpec(
        id="gpt-5.4-mini",
        display_name="GPT-5.4 Mini",
        input_price=0.75, output_price=4.50, cached_input_price=0.1875,
        max_context=400_000, max_output=128_000,
        supports_vision=True,
        tool_calling=ToolCallReliability.RELIABLE,
        categories=[ModelCategory.FAST, ModelCategory.CODE],
        speed="fast",
        openrouter_id="openai/gpt-5.4-mini",
        native_id="gpt-5.4-mini", native_provider=Provider.OPENAI_NATIVE,
    ),

    "gpt-5.4-nano": ModelSpec(
        id="gpt-5.4-nano",
        display_name="GPT-5.4 Nano",
        input_price=0.20, output_price=1.25, cached_input_price=0.05,
        max_context=400_000, max_output=128_000,
        supports_vision=True,
        tool_calling=ToolCallReliability.RELIABLE,
        categories=[ModelCategory.FAST, ModelCategory.CHEAP],
        speed="fast",
        openrouter_id="openai/gpt-5.4-nano",
        native_id="gpt-5.4-nano", native_provider=Provider.OPENAI_NATIVE,
    ),

    "o3": ModelSpec(
        id="o3",
        display_name="o3 (Deep Reasoning)",
        input_price=2.00, output_price=8.00, cached_input_price=0.50,
        max_context=200_000, max_output=100_000,
        supports_vision=True,
        tool_calling=ToolCallReliability.RELIABLE,
        categories=[ModelCategory.REASONING],
        speed="slow", is_reasoning=True,
        openrouter_id="openai/o3",
        native_id="o3", native_provider=Provider.OPENAI_NATIVE,
    ),

    "o4-mini": ModelSpec(
        id="o4-mini",
        display_name="o4-mini (Reasoning)",
        input_price=1.10, output_price=4.40, cached_input_price=0.275,
        max_context=200_000, max_output=100_000,
        supports_vision=True,
        tool_calling=ToolCallReliability.RELIABLE,
        categories=[ModelCategory.REASONING, ModelCategory.CHEAP],
        speed="medium", is_reasoning=True,
        openrouter_id="openai/o4-mini",
        native_id="o4-mini", native_provider=Provider.OPENAI_NATIVE,
    ),

    # ── Google ────────────────────────────────────────────────────────────────

    "gemini-3.1-pro": ModelSpec(
        id="gemini-3.1-pro",
        display_name="Gemini 3.1 Pro",
        input_price=2.00, output_price=12.00, cached_input_price=0.50,
        max_context=1_048_576, max_output=32_000,
        supports_vision=True,
        tool_calling=ToolCallReliability.RELIABLE,
        categories=[ModelCategory.CODE],
        swe_bench=80.6, speed="medium",
        openrouter_id="google/gemini-3.1-pro-preview",
        native_id="gemini-3.1-pro-preview", native_provider=Provider.GOOGLE_NATIVE,
    ),

    "gemini-2.5-flash": ModelSpec(
        id="gemini-2.5-flash",
        display_name="Gemini 2.5 Flash",
        input_price=0.30, output_price=2.50, cached_input_price=0.075,
        max_context=1_048_576, max_output=16_000,
        supports_vision=True,
        tool_calling=ToolCallReliability.RELIABLE,
        categories=[ModelCategory.FAST],
        speed="fast",
        openrouter_id="google/gemini-2.5-flash",
    ),

    "gemini-2.5-flash-lite": ModelSpec(
        id="gemini-2.5-flash-lite",
        display_name="Gemini 2.5 Flash Lite",
        input_price=0.10, output_price=0.40, cached_input_price=0.025,
        max_context=1_048_576, max_output=8_000,
        supports_vision=True,
        tool_calling=ToolCallReliability.OK,
        categories=[ModelCategory.FAST, ModelCategory.CHEAP],
        speed="fast",
        openrouter_id="google/gemini-2.5-flash-lite",
    ),

    # ── DeepSeek ──────────────────────────────────────────────────────────────

    "deepseek-v3.2": ModelSpec(
        id="deepseek-v3.2",
        display_name="DeepSeek V3.2",
        input_price=0.26, output_price=0.38, cached_input_price=0.07,
        max_context=128_000, max_output=16_000,
        supports_vision=False,
        tool_calling=ToolCallReliability.UNSTABLE,
        categories=[ModelCategory.CHEAP, ModelCategory.CODE],
        swe_bench=73.0, speed="medium",
        openrouter_id="deepseek/deepseek-chat-v3-0324",
    ),

    "deepseek-v3.1": ModelSpec(
        id="deepseek-v3.1",
        display_name="DeepSeek V3.1",
        input_price=0.15, output_price=0.75,
        max_context=128_000, max_output=16_000,
        supports_vision=False,
        tool_calling=ToolCallReliability.UNSTABLE,
        categories=[ModelCategory.CHEAP, ModelCategory.CODE],
        speed="medium",
        openrouter_id="deepseek/deepseek-chat-v3.1",
    ),

    "deepseek-r1": ModelSpec(
        id="deepseek-r1",
        display_name="DeepSeek R1",
        input_price=0.70, output_price=2.50, cached_input_price=0.18,
        max_context=128_000, max_output=64_000,
        supports_vision=False,
        tool_calling=ToolCallReliability.UNSTABLE,
        categories=[ModelCategory.REASONING, ModelCategory.CHEAP],
        speed="slow", is_reasoning=True,
        openrouter_id="deepseek/deepseek-r1",
    ),

    # ── MiniMax ───────────────────────────────────────────────────────────────

    "minimax-m2.5": ModelSpec(
        id="minimax-m2.5",
        display_name="MiniMax M2.5",
        input_price=0.12, output_price=1.00,
        max_context=204_800, max_output=16_000,
        supports_vision=False,
        tool_calling=ToolCallReliability.UNSTABLE,
        categories=[ModelCategory.CODE, ModelCategory.CHEAP],
        swe_bench=80.2, speed="fast",
        openrouter_id="minimax/minimax-m2.5",
    ),

    # ── xAI (Grok) ────────────────────────────────────────────────────────────

    "grok-4": ModelSpec(
        id="grok-4",
        display_name="Grok 4",
        input_price=3.00, output_price=15.00,
        max_context=1_000_000, max_output=32_000,
        supports_vision=True,
        tool_calling=ToolCallReliability.RELIABLE,
        categories=[ModelCategory.GENERAL, ModelCategory.CODE],
        speed="medium",
        openrouter_id="x-ai/grok-4",
    ),

    "grok-4-fast": ModelSpec(
        id="grok-4-fast",
        display_name="Grok 4 Fast",
        input_price=0.20, output_price=0.50,
        max_context=1_000_000, max_output=16_000,
        supports_vision=False,
        tool_calling=ToolCallReliability.RELIABLE,
        categories=[ModelCategory.FAST, ModelCategory.CHEAP],
        speed="fast",
        openrouter_id="x-ai/grok-4-fast",
    ),

    # ── Free Models (verified via OpenRouter API 2026-04-02) ─────────────────

    "qwen3-coder-free": ModelSpec(
        id="qwen3-coder-free",
        display_name="Qwen3 Coder (Free)",
        input_price=0.0, output_price=0.0,
        max_context=262_000, max_output=16_000,
        supports_vision=False,
        tool_calling=ToolCallReliability.OK,
        categories=[ModelCategory.FREE, ModelCategory.CODE],
        speed="medium", is_free=True,
        openrouter_id="qwen/qwen3-coder:free",
    ),

    "minimax-m2.5-free": ModelSpec(
        id="minimax-m2.5-free",
        display_name="MiniMax M2.5 (Free)",
        input_price=0.0, output_price=0.0,
        max_context=196_000, max_output=16_000,
        supports_vision=False,
        tool_calling=ToolCallReliability.RELIABLE,
        categories=[ModelCategory.FREE, ModelCategory.CODE],
        swe_bench=80.2, speed="fast", is_free=True,
        openrouter_id="minimax/minimax-m2.5:free",
    ),

    "qwen3.6-plus-free": ModelSpec(
        id="qwen3.6-plus-free",
        display_name="Qwen 3.6 Plus (Free)",
        input_price=0.0, output_price=0.0,
        max_context=1_000_000, max_output=16_000,
        supports_vision=False,
        tool_calling=ToolCallReliability.OK,
        categories=[ModelCategory.FREE, ModelCategory.GENERAL],
        speed="medium", is_free=True,
        openrouter_id="qwen/qwen3.6-plus:free",
    ),

    "nemotron-3-super-free": ModelSpec(
        id="nemotron-3-super-free",
        display_name="Nemotron 3 Super 120B (Free)",
        input_price=0.0, output_price=0.0,
        max_context=262_000, max_output=16_000,
        supports_vision=False,
        tool_calling=ToolCallReliability.OK,
        categories=[ModelCategory.FREE, ModelCategory.CODE],
        speed="medium", is_free=True,
        openrouter_id="nvidia/nemotron-3-super-120b-a12b:free",
    ),

    "step-3.5-flash-free": ModelSpec(
        id="step-3.5-flash-free",
        display_name="Step 3.5 Flash (Free)",
        input_price=0.0, output_price=0.0,
        max_context=256_000, max_output=16_000,
        supports_vision=False,
        tool_calling=ToolCallReliability.OK,
        categories=[ModelCategory.FREE, ModelCategory.CODE],
        swe_bench=74.4, speed="fast", is_free=True,
        openrouter_id="stepfun/step-3.5-flash:free",
    ),

    "step-3.5-flash": ModelSpec(
        id="step-3.5-flash",
        display_name="Step 3.5 Flash",
        input_price=0.10, output_price=0.30,
        max_context=128_000, max_output=16_000,
        supports_vision=False,
        tool_calling=ToolCallReliability.OK,
        categories=[ModelCategory.CHEAP, ModelCategory.CODE],
        swe_bench=74.4, speed="fast",
        openrouter_id="stepfun/step-3.5-flash",
    ),

    "kimi-k2.5": ModelSpec(
        id="kimi-k2.5",
        display_name="Kimi K2.5",
        input_price=0.38, output_price=1.91,
        max_context=128_000, max_output=16_000,
        supports_vision=False,
        tool_calling=ToolCallReliability.OK,
        categories=[ModelCategory.CODE],
        swe_bench=76.8, speed="medium",
        openrouter_id="moonshotai/kimi-k2.5",
    ),
    "llama-3.3-70b-free": ModelSpec(
        id="llama-3.3-70b-free",
        display_name="Llama 3.3 70B (Free)",
        openrouter_id="meta-llama/llama-3.3-70b-instruct:free",
        max_context=131072,
        input_price=0.0,
        output_price=0.0,
        is_free=True,
        tool_calling=ToolCallReliability.RELIABLE,
    ),
    "gpt-oss-120b-free": ModelSpec(
        id="gpt-oss-120b-free",
        display_name="GPT OSS 120B (Free)",
        openrouter_id="openai/gpt-oss-120b:free",
        max_context=32768,
        input_price=0.0,
        output_price=0.0,
        is_free=True,
        tool_calling=ToolCallReliability.RELIABLE,
    ),
    "qwen3-next-80b-free": ModelSpec(
        id="qwen3-next-80b-free",
        display_name="Qwen3 Next 80B (Free)",
        openrouter_id="qwen/qwen3-next-80b-a3b-instruct:free",
        max_context=32768,
        input_price=0.0,
        output_price=0.0,
        is_free=True,
        tool_calling=ToolCallReliability.RELIABLE,
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# IMAGE GENERATION MODELS
# ═══════════════════════════════════════════════════════════════════════════════

IMAGE_MODELS: dict[str, ImageModelSpec] = {

    "flux-2-pro": ImageModelSpec(
        id="flux-2-pro", provider=Provider.FAL_AI,
        display_name="Flux 2 Pro", price_per_image=0.055,
        max_resolution="2048x2048",
        best_for=["photorealism", "portraits", "products", "hero"], speed="fast",
    ),
    "flux-2-schnell": ImageModelSpec(
        id="flux-2-schnell", provider=Provider.FAL_AI,
        display_name="Flux 2 Schnell", price_per_image=0.015,
        max_resolution="1024x1024",
        best_for=["drafts", "bulk", "previews"], speed="fast",
    ),
    "midjourney-v8": ImageModelSpec(
        id="midjourney-v8", provider=Provider.MIDJOURNEY,
        display_name="Midjourney V8", price_per_image=0.10,
        max_resolution="2048x2048",
        best_for=["art", "aesthetics", "premium", "concepts"], speed="medium",
    ),
    "ideogram-v3": ImageModelSpec(
        id="ideogram-v3", provider=Provider.IDEOGRAM,
        display_name="Ideogram V3", price_per_image=0.04,
        supports_text=True,
        best_for=["logos_with_text", "posters", "signage", "typography"], speed="medium",
    ),
    "recraft-v4": ImageModelSpec(
        id="recraft-v4", provider=Provider.FAL_AI,
        display_name="Recraft V4", price_per_image=0.04,
        max_resolution="2048x2048", supports_svg=True,
        best_for=["logos", "icons", "svg", "brand", "vector"], speed="fast",
    ),
    "imagen-4-fast": ImageModelSpec(
        id="imagen-4-fast", provider=Provider.GOOGLE_NATIVE,
        display_name="Imagen 4 Fast", price_per_image=0.02,
        max_resolution="2048x2048",
        best_for=["faces", "portraits", "avatars"], speed="fast",
    ),
    "pexels": ImageModelSpec(
        id="pexels", provider=Provider.PEXELS,
        display_name="Pexels (Free Stock)", price_per_image=0.0,
        best_for=["stock_photos", "backgrounds", "textures"], is_free=True,
    ),
}


# ═══════════════════════════════════════════════════════════════════════════════
# MANUS AGENT
# ═══════════════════════════════════════════════════════════════════════════════

MANUS = ManusSpec()


# ═══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def get_model(model_id: str) -> ModelSpec | None:
    return MODELS.get(model_id)

def get_model_or_raise(model_id: str) -> ModelSpec:
    model = MODELS.get(model_id)
    if not model:
        raise ValueError(f"Unknown model: '{model_id}'. Available: {list(MODELS.keys())}")
    return model

def get_image_model(model_id: str) -> ImageModelSpec | None:
    return IMAGE_MODELS.get(model_id)

def get_models_by_category(category: ModelCategory) -> list[ModelSpec]:
    return [m for m in MODELS.values() if category in m.categories]

def get_free_models() -> list[ModelSpec]:
    return [m for m in MODELS.values() if m.is_free]

def get_models_with_tool_calling(
    min_reliability: ToolCallReliability = ToolCallReliability.RELIABLE,
) -> list[ModelSpec]:
    return [m for m in MODELS.values() if m.tool_calling.is_at_least(min_reliability)]

def get_cheapest_model(
    min_tool_calling: ToolCallReliability = ToolCallReliability.RELIABLE,
    needs_vision: bool = False,
) -> ModelSpec | None:
    candidates = [
        m for m in MODELS.values()
        if not m.is_deprecated
        and m.tool_calling.is_at_least(min_tool_calling)
        and (not needs_vision or m.supports_vision)
    ]
    if not candidates:
        return None
    return min(candidates, key=lambda m: m.input_price + m.output_price)

def estimate_task_cost(model_id: str, input_tokens: int = 5000,
                       output_tokens: int = 2000, use_cache: bool = False) -> float | None:
    model = get_model(model_id)
    if not model:
        return None
    return model.cost_estimate(input_tokens, output_tokens, use_cache=use_cache)


# ═══════════════════════════════════════════════════════════════════════════════
# FALLBACK CHAINS — verified model IDs
# ═══════════════════════════════════════════════════════════════════════════════

FALLBACK_CHAINS: dict[str, list[str]] = {
    "claude-opus-4.6":      ["gpt-5.4", "gemini-3.1-pro", "claude-sonnet-4.6"],
    "claude-sonnet-4.6":    ["gemini-3.1-pro", "gpt-5.4-mini", "claude-haiku-4.5"],
    "claude-haiku-4.5":     ["gpt-5.4-nano", "gemini-2.5-flash"],
    "gpt-5.4":              ["claude-sonnet-4.6", "gemini-3.1-pro"],
    "gpt-5.4-mini":         ["gemini-2.5-flash", "claude-haiku-4.5", "gpt-5.4-nano"],
    "gpt-5.4-nano":         ["gemini-2.5-flash-lite", "grok-4-fast"],
    "o3":                   ["gpt-5.4", "claude-opus-4.6", "o4-mini"],
    "o4-mini":              ["gpt-5.4-mini", "gemini-2.5-flash"],
    "gemini-3.1-pro":       ["gpt-5.4", "claude-sonnet-4.6"],
    "gemini-2.5-flash":     ["gemini-2.5-flash-lite", "gpt-5.4-nano"],
    "gemini-2.5-flash-lite": ["gpt-5.4-nano", "grok-4-fast"],
    "grok-4":               ["gpt-5.4", "claude-sonnet-4.6"],
    "grok-4-fast":          ["gpt-5.4-nano", "gemini-2.5-flash-lite"],
    "deepseek-v3.2":        ["grok-4-fast", "gpt-5.4-nano", "gemini-2.5-flash"],
    "deepseek-v3.1":        ["deepseek-v3.2", "grok-4-fast", "gpt-5.4-nano"],
    "deepseek-r1":          ["o4-mini", "gpt-5.4-mini"],
    "minimax-m2.5":         ["grok-4-fast", "gpt-5.4-nano", "gemini-2.5-flash"],
    "step-3.5-flash-free":  ["qwen3-coder-free", "minimax-m2.5-free", "qwen3-coder-free"],
    "qwen3-coder-free": ["qwen3-coder-free", "step-3.5-flash-free", "nemotron-3-super-free"],
    "qwen3-coder-free":     ["minimax-m2.5-free", "step-3.5-flash-free", "nemotron-3-super-free"],
    "minimax-m2.5-free":    ["qwen3-coder-free", "step-3.5-flash-free", "nemotron-3-super-free"],
    "qwen3.6-plus-free":    ["qwen3-coder-free", "qwen3-coder-free", "step-3.5-flash-free"],
    "nemotron-3-super-free": ["qwen3-coder-free", "step-3.5-flash-free", "qwen3-coder-free"],
    "step-3.5-flash":       ["kimi-k2.5", "deepseek-v3.1", "gpt-5.4-nano"],
    "kimi-k2.5":            ["step-3.5-flash", "deepseek-v3.2", "gpt-5.4-nano"],
}


def get_fallback(model_id: str, _visited: set | None = None) -> ModelSpec | None:
    if _visited is None:
        _visited = set()
    _visited.add(model_id)
    chain = FALLBACK_CHAINS.get(model_id, [])
    for fb_id in chain:
        if fb_id in _visited:
            continue
        fb = get_model(fb_id)
        if fb and not fb.is_deprecated:
            return fb
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# IMAGE ROUTING HINTS
# ═══════════════════════════════════════════════════════════════════════════════

IMAGE_ROUTING_HINTS: dict[str, str] = {
    "photo_people": "flux-2-pro", "photo_product": "flux-2-pro",
    "art_premium": "midjourney-v8", "art_concept": "midjourney-v8",
    "logo_with_text": "ideogram-v3", "logo_vector": "recraft-v4",
    "icon_svg": "recraft-v4", "draft_preview": "flux-2-schnell",
    "bulk_generation": "flux-2-schnell", "portrait_avatar": "imagen-4-fast",
    "stock_photo": "pexels",
}


# ═══════════════════════════════════════════════════════════════════════════════
# VALIDATION
# ═══════════════════════════════════════════════════════════════════════════════

def validate_registry() -> list[str]:
    issues = []
    for model_id, chain in FALLBACK_CHAINS.items():
        if model_id not in MODELS:
            issues.append(f"FALLBACK_SOURCE: '{model_id}' not in MODELS")
        if model_id in chain:
            issues.append(f"SELF_LOOP: '{model_id}'")
        for fb_id in chain:
            if fb_id not in MODELS:
                issues.append(f"FALLBACK_TARGET: '{model_id}' → '{fb_id}' missing")
    for model_id in MODELS:
        if model_id not in FALLBACK_CHAINS:
            issues.append(f"NO_FALLBACK: '{model_id}'")
    for model_id, m in MODELS.items():
        if m.id != model_id:
            issues.append(f"ID_MISMATCH: key='{model_id}' id='{m.id}'")
    return issues


def print_registry_summary():
    print(f"\n{'='*70}")
    print(f"ARCANE 2 MODEL REGISTRY (verified 2026-04-02)")
    print(f"{'='*70}")
    print(f"\nLLM Models ({len(MODELS)}):")
    for m in sorted(MODELS.values(), key=lambda x: x.input_price + x.output_price):
        tc = m.tool_calling.value[:3].upper()
        free = " [FREE]" if m.is_free else ""
        swe = f" SWE:{m.swe_bench:.1f}%" if m.swe_bench else ""
        print(f"  {m.display_name:<30} ${m.input_price:>5.2f}/${m.output_price:>5.2f}  "
              f"ctx:{m.max_context//1000}K  tc:{tc}{swe}{free}")
    print(f"\nImage Models ({len(IMAGE_MODELS)}):")
    for m in sorted(IMAGE_MODELS.values(), key=lambda x: x.price_per_image):
        print(f"  {m.display_name:<25} ${m.price_per_image:.3f}/img  best: {', '.join(m.best_for[:3])}")
    print(f"\nManus: ${MANUS.monthly_cost}/mo = {MANUS.monthly_credits:,} credits")
    tc_r = len(get_models_with_tool_calling())
    free = len(get_free_models())
    print(f"Reliable tool calling: {tc_r} | Free: {free}")
    issues = validate_registry()
    print(f"Validation: {'ALL CLEAN' if not issues else f'{len(issues)} issues'}")
    if issues:
        for i in issues: print(f"  ⚠ {i}")
    print(f"{'='*70}\n")


if __name__ == "__main__":
    print_registry_summary()


# ═══════════════════════════════════════════════════════════════════════════════
# ROLES / STRATEGY / TIERS — used by preset_manager.py and router.py
# ═══════════════════════════════════════════════════════════════════════════════

from shared.models.schemas import Tier, ModelRole

# Tier escalation: NANO (cheapest) → DEEP (most powerful)
TIER_ESCALATION_ORDER: list[Tier] = [
    Tier.FREE, Tier.NANO, Tier.FAST, Tier.STANDARD, Tier.GENIUS, Tier.DEEP,
]

# Role definitions with per-tier model assignments.
# PresetManager resolves role+mode → tier → model_id via this map.
ROLES: dict[str, ModelRole] = {

    "classifier": ModelRole(
        name="classifier",
        tiers={
            Tier.FREE:     "step-3.5-flash-free",   # user-specified,   # CRIT-6 (tool-capable)
            Tier.NANO:     "gpt-5.4-nano",
            Tier.FAST:     "gemini-2.5-flash",
            Tier.STANDARD: "gpt-5.4-mini",
            Tier.GENIUS:   "gpt-5.4",
        },
        default_tier=Tier.NANO,
    ),

    "planner": ModelRole(
        name="planner",
        tiers={
            Tier.FREE:     "qwen3-next-80b-free",   # user-specified,   # CRIT-6
            Tier.NANO:     "gpt-5.4-nano",
            Tier.FAST:     "gpt-5.4-mini",
            Tier.STANDARD: "gpt-5.4",
            Tier.GENIUS:   "claude-opus-4.6",
        },
        default_tier=Tier.FAST,
    ),

    "orchestrator": ModelRole(
        name="orchestrator",
        tiers={
            Tier.FREE:     "qwen3-coder-free",   # user-specified,  # CRIT-6 (tool-capable)
            Tier.NANO:     "gemini-2.5-flash",
            Tier.FAST:     "gemini-2.5-flash",
            Tier.STANDARD: "gpt-5.4-mini",
            Tier.GENIUS:   "gpt-5.4",
        },
        default_tier=Tier.NANO,
    ),

    "coding": ModelRole(
        name="coding",
        tiers={
            Tier.FREE:     "minimax-m2.5-free",   # user-specified,    # CRIT-6 (tool-capable)
            Tier.NANO:     "deepseek-v3.2",
            Tier.FAST:     "deepseek-v3.2",
            Tier.STANDARD: "claude-sonnet-4.6",
            Tier.GENIUS:   "gpt-5.4",
            Tier.DEEP:     "claude-opus-4.6",
        },
        fallback_chain={"deepseek-v3.2": "gpt-5.4-mini", "gpt-5.4-mini": "claude-sonnet-4.6"},
        default_tier=Tier.STANDARD,
    ),

    # "coder" alias — orchestrator uses this role name
    "coder": ModelRole(
        name="coder",
        tiers={
            Tier.FREE:     "minimax-m2.5-free",   # user-specified,    # CRIT-6 (tool-capable)
            Tier.NANO:     "deepseek-v3.2",
            Tier.FAST:     "deepseek-v3.2",
            Tier.STANDARD: "claude-sonnet-4.6",
            Tier.GENIUS:   "gpt-5.4",
            Tier.DEEP:     "claude-opus-4.6",
        },
        fallback_chain={"deepseek-v3.2": "gpt-5.4-mini"},
        default_tier=Tier.STANDARD,
    ),

    "designer": ModelRole(
        name="designer",
        tiers={
            Tier.FREE:     "minimax-m2.5-free",   # user-specified (tool-capable)
            Tier.NANO:     "deepseek-v3.2",
            Tier.FAST:     "gpt-5.4-mini",
            Tier.STANDARD: "claude-sonnet-4.6",
            Tier.GENIUS:   "claude-sonnet-4.6",
            Tier.DEEP:     "claude-opus-4.6",
        },
        default_tier=Tier.STANDARD,
    ),

    "ssh": ModelRole(
        name="ssh",
        tiers={
            Tier.FREE:     "nemotron-3-super-free",   # user-specified,    # CRIT-6
            Tier.NANO:     "deepseek-v3.2",
            Tier.FAST:     "gpt-5.4-mini",
            Tier.STANDARD: "gpt-5.4",
            Tier.GENIUS:   "claude-opus-4.6",
        },
        default_tier=Tier.FAST,
    ),

    "browser": ModelRole(
        name="browser",
        tiers={
            Tier.FREE:     "nemotron-nano-12b-vl-free",   # user-specified,   # CRIT-6
            Tier.FAST:     "gpt-5.4-mini",
            Tier.STANDARD: "claude-sonnet-4.6",
            Tier.GENIUS:   "gpt-5.4",
        },
        default_tier=Tier.STANDARD,
    ),

    "qa": ModelRole(
        name="qa",
        tiers={
            Tier.FREE:     "llama-3.3-70b-free",   # user-specified,  # CRIT-6
            Tier.NANO:     "gpt-5.4-nano",
            Tier.FAST:     "gpt-5.4-mini",
            Tier.STANDARD: "claude-sonnet-4.6",
            Tier.GENIUS:   "gpt-5.4",
        },
        default_tier=Tier.FAST,
    ),

    "search": ModelRole(
        name="search",
        tiers={
            Tier.FREE:     "step-3.5-flash-free",   # user-specified,  # CRIT-6 (tool-capable)
            Tier.NANO:     "gpt-5.4-nano",
            Tier.FAST:     "gemini-2.5-flash",
            Tier.STANDARD: "gpt-5.4-mini",
        },
        default_tier=Tier.FAST,
    ),

    "writer": ModelRole(
        name="writer",
        tiers={
            Tier.FREE:     "gpt-oss-120b-free",   # user-specified
            Tier.NANO:     "deepseek-v3.2",
            Tier.FAST:     "gpt-5.4-mini",
            Tier.STANDARD: "claude-sonnet-4.6",
            Tier.GENIUS:   "claude-opus-4.6",
        },
        default_tier=Tier.STANDARD,
    ),

    "researcher": ModelRole(
        name="researcher",
        tiers={
            Tier.FREE:     "gpt-oss-120b-free",   # user-specified (tool-capable)
            Tier.NANO:     "gemini-2.5-flash",
            Tier.FAST:     "gpt-5.4-mini",
            Tier.STANDARD: "gpt-5.4",
            Tier.GENIUS:   "claude-opus-4.6",
        },
        default_tier=Tier.FAST,
    ),
}

# Strategy → per-role tier mapping.
# PresetManager._MODE_TO_STRATEGY maps user mode → strategy key.
#   FREE → "free"    LITE → "economy"    OPTIMUM → "balance"    TOP → "quality"
STRATEGY_TIER_MAP: dict[str, dict[str, Tier]] = {

    "economy": {    # LITE mode — acceptable quality, min cost
        "classifier":   Tier.NANO,
        "planner":      Tier.NANO,
        "orchestrator": Tier.NANO,
        "coding":       Tier.FAST,
        "coder":        Tier.FAST,
        "designer":     Tier.FAST,
        "ssh":          Tier.NANO,
        "browser":      Tier.FAST,
        "qa":           Tier.NANO,
        "search":       Tier.NANO,
        "writer":       Tier.FAST,
        "researcher":   Tier.NANO,
    },

    "balance": {    # OPTIMUM mode (default) — 90% quality at 50% price
        "classifier":   Tier.NANO,
        "planner":      Tier.FAST,
        "orchestrator": Tier.NANO,
        "coding":       Tier.STANDARD,
        "coder":        Tier.STANDARD,
        "designer":     Tier.STANDARD,
        "ssh":          Tier.FAST,
        "browser":      Tier.STANDARD,
        "qa":           Tier.FAST,
        "search":       Tier.FAST,
        "writer":       Tier.STANDARD,
        "researcher":   Tier.FAST,
    },

    "quality": {    # TOP mode — best model per role
        "classifier":   Tier.FAST,
        "planner":      Tier.STANDARD,
        "orchestrator": Tier.FAST,
        "coding":       Tier.GENIUS,
        "coder":        Tier.GENIUS,
        "designer":     Tier.GENIUS,
        "ssh":          Tier.STANDARD,
        "browser":      Tier.GENIUS,
        "qa":           Tier.STANDARD,
        "search":       Tier.STANDARD,
        "writer":       Tier.GENIUS,
        "researcher":   Tier.STANDARD,
    },

    # "free" strategy is registered dynamically by preset_manager.ensure_free_strategy()
}


# ═══════════════════════════════════════════════════════════════════════════════
# BACKWARD-COMPAT HELPERS — keep old-style callers working
# ═══════════════════════════════════════════════════════════════════════════════

# Simple role→model_id dict for code that does ROLES_SIMPLE["coder"]
ROLES_SIMPLE: dict[str, str] = {
    role_name: role_def.tiers.get(role_def.default_tier, "claude-sonnet-4.6")
    for role_name, role_def in ROLES.items()
}


def get_fallback_model(model_id: str) -> "ModelSpec | None":
    """Alias for get_fallback — backward compat."""
    return get_fallback(model_id)


def get_model_for_role(role: str, tier: str = "standard") -> "ModelSpec | None":
    """Return best model for a given role and tier (backward compat)."""
    role_def = ROLES.get(role)
    if role_def:
        # Try to map string tier to Tier enum
        _tier_map = {"budget": Tier.NANO, "standard": Tier.STANDARD,
                     "premium": Tier.GENIUS, "max": Tier.DEEP}
        t = _tier_map.get(tier, Tier.STANDARD)
        model_id = role_def.tiers.get(t)
        if model_id:
            return MODELS.get(model_id)
        # Fallback to default tier
        model_id = role_def.tiers.get(role_def.default_tier)
        if model_id:
            return MODELS.get(model_id)
    return get_cheapest_model()


def get_next_tier(current_tier: str) -> str:
    """Return the next escalation tier (backward compat, returns string)."""
    _order = ["budget", "standard", "premium", "max"]
    try:
        idx = _order.index(current_tier)
        return _order[min(idx + 1, len(_order) - 1)]
    except ValueError:
        return "standard"

# ═══════════════════════════════════════════════════════════════════════════════
# MODEL ID CANONICALIZATION — Fix #4
# ═══════════════════════════════════════════════════════════════════════════════

# Alias mapping: all variants → canonical id
_MODEL_ALIASES: dict[str, str] = {}

def _build_aliases():
    """Build alias map from all known model IDs."""
    for model_id, spec in MODELS.items():
        canonical = model_id  # e.g. "claude-opus-4.6"
        _MODEL_ALIASES[canonical] = canonical
        # Dashed variant: "claude-opus-4-6"
        dashed = canonical.replace(".", "-")
        _MODEL_ALIASES[dashed] = canonical
        # With provider prefix from openrouter_id: "anthropic/claude-opus-4.6"
        if hasattr(spec, 'openrouter_id') and spec.openrouter_id:
            _MODEL_ALIASES[spec.openrouter_id] = canonical
        # Native id variant
        if hasattr(spec, 'native_id') and spec.native_id:
            _MODEL_ALIASES[spec.native_id] = canonical

_build_aliases()

def canonicalize_model_id(model_id: str) -> str:
    """Convert any model ID variant to canonical format.
    
    Handles:
    - "claude-opus-4.6"          (canonical)
    - "claude-opus-4-6"          (dashed variant)
    - "anthropic/claude-opus-4.6" (provider-prefixed)
    """
    return _MODEL_ALIASES.get(model_id, model_id)

def get_model_price(model_id: str) -> tuple[float, float]:
    """Get (input_price, output_price) per 1M tokens for any model ID format.
    
    Returns safe fallback (0.01, 0.01) instead of $0 for unknown models.
    """
    canonical = canonicalize_model_id(model_id)
    spec = MODELS.get(canonical)
    if spec:
        return (spec.input_price, spec.output_price)
    return (0.01, 0.01)  # safe fallback, not $0
