# 001 - Unify the motion language

- **Status**: DONE
- **Commit**: unversioned workspace
- **Severity**: MEDIUM
- **Category**: Easing, duration, and cohesion
- **Estimated scope**: 1 file, small

## Problem

`src/styles/global.css:91`, `:95`, `:215`, `:237`, `:276`, and `:404` use several weak built-in easings and near-duplicate custom curves. The product feels assembled from separate components instead of moving as one professional workspace.

```css
a { transition: color 180ms ease, background-color 180ms ease, border-color 180ms ease, opacity 180ms ease; }
.node-body { transition: transform .34s cubic-bezier(.16,1,.3,1), filter .24s ease; }
```

## Target

Add shared tokens to `:root` and apply them consistently:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);
--duration-press: 140ms;
--duration-fast: 180ms;
--duration-ui: 240ms;
```

## Repo conventions to follow

Global visual tokens already live at the top of `src/styles/global.css`. Keep all motion tokens there and use native CSS transitions; add no dependency.

## Steps

1. Add the exact tokens above to `:root`.
2. Replace weak built-in easings on links, buttons, graph nodes, filters, and cards with the correct shared token.
3. Keep constant neuron-signal motion linear and gesture motion direct.

## Boundaries

- Do not change data or page copy.
- Do not add an animation library.
- Do not animate layout properties.

## Verification

- **Mechanical**: `npm run build` exits 0.
- **Feel check**: inspect controls at 10% playback and confirm state feedback begins immediately without a slow start.
- **Done when**: no deliberate UI entrance uses a bare built-in easing and the named tokens govern the product.
