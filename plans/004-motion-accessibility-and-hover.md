# 004 - Preserve feedback under reduced motion

- **Status**: DONE
- **Commit**: unversioned workspace
- **Severity**: HIGH
- **Category**: Accessibility
- **Estimated scope**: 1 file, small

## Problem

`src/styles/global.css:530` reduces every transition to `0.01ms`, removing useful color and opacity feedback. Several transform hovers, including `src/styles/global.css:405`, are also active on touch pointers.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; }
}
```

## Target

Reduced motion keeps 160-200ms color and opacity feedback while removing translation, scale, and perpetual graph signals. Transform hovers live only under `@media (hover: hover) and (pointer: fine)`.

## Repo conventions to follow

The project already has a single reduced-motion block at the end of `global.css`; refine that block instead of creating parallel rules.

## Steps

1. Replace the global transition-duration override with explicit movement suppression.
2. Keep graph pulses hidden under reduced motion.
3. Move transform-based hover declarations into a fine-pointer media query.
4. Ensure focus-visible states remain equally strong.

## Boundaries

- Do not remove color, border, or opacity feedback.
- Do not hide functional content.

## Verification

- **Mechanical**: build and reduced-motion browser check pass.
- **Feel check**: emulate reduced motion; panels appear without travel, focus and selection remain visible, pulses stop.
- **Done when**: reduced motion means gentler motion rather than no feedback.
