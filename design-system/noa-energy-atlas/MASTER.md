# Noa Energy Atlas master system

Use the root `DESIGN.md` as the canonical specification. Page-specific files in `design-system/pages/` may refine layout but must preserve these rules.

## Direction

- Product character: energy control room meets legal atlas.
- Dials: variance 7/10, motion 6/10, density 6/10.
- Primary task: navigate Lebanon's legal energy framework, open a source-backed dossier, and follow verified updates.
- Hierarchy: knowledge graph first, energy briefing second, laws and instruments as the complete record.
- Surfaces: navy navigation and dossiers; cool paper canvas; cyan relationships; coral emphasis.
- Records: editorial rows and rules, not generic dashboard cards.
- Type: platform sans, tabular numerals, high-contrast reading measures, no remote font dependency.
- Shape language: controlled radii of 8-16px; circles reserved for graph nodes, Noa, and icon controls.

## Interaction

- Minimum target size is 44px where space allows and never below 40px.
- Every control has visible focus and active feedback.
- The graph supports mouse, touch, keyboard selection, pan, pinch, zoom, filter, reset, and movable nodes.
- Drawers open from the action that caused them and close without disturbing graph state.
- Arabic changes `lang`, `dir`, alignment, reading order, and curated labels together.

## Motion

- Press: 140ms; local UI: 180ms; spatial UI and drawers: 240-280ms.
- Use shared exponential or cubic-bezier easing tokens.
- Camera changes must be interruptible and never queue.
- Hover motion is limited to fine pointers.
- Relationship pulses are the one continuous ambient effect and stop under reduced motion.
- No scroll reveals, elastic theatrics, layout-shifting hover, or blanket `transition: all`.

## Accessibility and resilience

- Preserve semantic controls and focus order.
- Do not encode legal status by color alone.
- Maintain the list alternative to the graph.
- Respect reduced motion and system color preference while persisting explicit choices.
- Keep mobile pinch zoom available at both page and graph levels.
