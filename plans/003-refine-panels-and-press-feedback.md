# 003 - Refine panels and press feedback

- **Status**: DONE
- **Commit**: unversioned workspace
- **Severity**: MEDIUM
- **Category**: Physicality and feedback
- **Estimated scope**: 2 files, medium

## Problem

`src/styles/global.css:95` gives buttons no tactile press response. The inspector at `:237` takes 420ms and Noa at `:276` takes 480ms, which is leisurely for a repeatedly used professional workspace.

## Target

```css
button:active, .button-link:active { transform: scale(0.97); }
.graph-inspector { transition: transform 280ms var(--ease-drawer), opacity 180ms var(--ease-out); }
.noa-panel { transition: transform 280ms var(--ease-drawer), opacity 180ms var(--ease-out); }
```

Noa should have two identity-preserving visual states: calm idle and attentive panel-open, with a subtle 2-3px breathing transform only when reduced motion is not requested.

## Repo conventions to follow

Noa lives in `src/components/NoaPanel.astro`; all shared presentation lives in `src/styles/global.css`.

## Steps

1. Add 140ms press feedback to pressable elements without shifting layout.
2. Retune inspector and Noa panel entrances to the exact target values.
3. Add idle and listening Noa images, swapping to listening when the panel is open.
4. Gate hover and mascot movement behind pointer and reduced-motion media queries.

## Boundaries

- No chatbot UI and no invented capabilities.
- No detached effects, glow, particles, or mascot scenery.

## Verification

- **Mechanical**: build passes; image requests return 200.
- **Feel check**: press controls and open/close both panels repeatedly. Feedback is immediate, panels remain interruptible, and Noa stays calm.
- **Done when**: pressables acknowledge input in 140ms and panels settle in under 300ms.
