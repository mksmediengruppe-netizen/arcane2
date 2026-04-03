# Дизайн-концепции для Arcane 2 Prototype

<response>
<probability>0.07</probability>
<text>
<idea>
**Design Movement:** Dark Brutalism / Terminal Aesthetic
**Core Principles:** Monospace-first, raw data visibility, zero decoration, information density
**Color Philosophy:** Near-black (#0A0A0F) base, single amber accent (#D4A574), muted grays for hierarchy
**Layout Paradigm:** Asymmetric — narrow fixed left rail, fluid center, collapsible right drawer
**Signature Elements:** Thin 1px borders everywhere, uppercase labels with letter-spacing, progress bars as data
**Interaction Philosophy:** Every click produces immediate visual feedback; no loading spinners, only skeleton states
**Animation:** 150ms ease-out only; no bounce, no spring — purposeful and fast
**Typography System:** JetBrains Mono for data/labels, Inter for prose; strict size scale 11/13/15/20/28px
</idea>
</text>
</response>

<response>
<probability>0.06</probability>
<text>
<idea>
**Design Movement:** Refined Dark SaaS / Claude-inspired minimalism
**Core Principles:** Text-first, generous whitespace, muted palette, document-like reading experience
**Color Philosophy:** Dark slate (#111318) background, off-white (#E8E8EA) text, single blue (#3B82F6) accent — calm, professional
**Layout Paradigm:** Three resizable columns with drag handles; center column is the star, sides are tools
**Signature Elements:** Subtle dividers instead of borders, soft shadow cards, inline cost badges
**Interaction Philosophy:** Interface disappears — user focuses on content; panels slide in/out smoothly
**Animation:** 200ms cubic-bezier(0.4,0,0.2,1); panels resize with spring; messages fade in from bottom
**Typography System:** Inter 400/500/600, size 13px base; monospace only for code blocks and cost figures
</idea>
</text>
</response>

<response>
<probability>0.05</probability>
<text>
<idea>
**Design Movement:** Neo-Industrial / Precision Tool
**Core Principles:** Grid-based, high information density, color-coded status system, engineering precision
**Color Philosophy:** Deep navy (#0D1117) base, cool gray hierarchy, green/yellow/red status system, indigo accent
**Layout Paradigm:** Fixed-width sidebar (260px), fluid main, right panel as overlay drawer
**Signature Elements:** Color-coded status dots, monospace cost counters, animated race tracks
**Interaction Philosophy:** Power-user first — keyboard shortcuts, collapsible everything, dense tables
**Animation:** Minimal — only progress bars animate; transitions 100ms linear
**Typography System:** IBM Plex Mono for UI chrome, IBM Plex Sans for content; tight line-height 1.4
</idea>
</text>
</response>

## Выбранная концепция: Refined Dark SaaS (#2)

Тёмный, профессиональный интерфейс с акцентом на читаемость и компактность. Три ресайзируемые колонки, документоподобный чат без пузырей, мягкие переходы. Единственный акцентный цвет — синий.
