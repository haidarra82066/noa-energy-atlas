# 002 - Make the graph camera interruptible

- **Status**: DONE
- **Commit**: unversioned workspace
- **Severity**: HIGH
- **Category**: Interruptibility and performance
- **Estimated scope**: 1 file, medium

## Problem

`src/components/RelationshipAtlas.astro:139` starts a new 440ms `requestAnimationFrame` loop for every zoom, reset, and category focus. Rapid input can leave competing loops writing `viewBox`, making the map feel heavy and imprecise.

```ts
const animateView=(next:typeof view)=>{if(reduced){setView(next);return}const start={...view},t0=performance.now();const tick=(now:number)=>{const p=Math.min(1,(now-t0)/440) ... }};
```

## Target

Store the active camera frame id, cancel it before a new camera transition, and use a 260ms exponential ease-out. Wheel and pinch gestures remain direct and cancel any active camera animation.

## Repo conventions to follow

The graph already keeps continuous values outside framework state. Continue direct `viewBox` writes and native pointer events.

## Steps

1. Add one `cameraFrame` variable and a `stopCamera()` helper.
2. Rebuild `animateView()` with cancellation and a 260ms duration using `1-Math.pow(1-p,4)`.
3. Cancel the camera before wheel, pinch, pan, and node drag input.
4. Use the same 3600 maximum width for toolbar and pinch zoom.

## Boundaries

- Do not change graph data, layout coordinates, or filter semantics.
- Do not add dependencies.

## Verification

- **Mechanical**: build and UI verification pass.
- **Feel check**: alternate zoom-in/zoom-out rapidly; the camera must retarget from its current position with no snap or fight.
- **Done when**: only one camera animation can write `viewBox` at a time and all direct gestures interrupt it.
