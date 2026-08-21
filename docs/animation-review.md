# Animation review

## Part 1: Before, after, and rationale

| Before | After | Why |
| --- | --- | --- |
| Separate components used built-in `ease` curves and near-duplicate timings. | Shared press, fast, UI, drawer, ease-out, and ease-in-out tokens govern the product. | One motion language makes the workspace feel coherent and keeps duration decisions auditable. |
| Every zoom or reset could start a new 440ms camera loop. | Camera movement is 260ms, exponentially eased, and cancels the active frame before retargeting. | Rapid graph input remains interruptible and never queues competing viewBox writes. |
| Pinch and toolbar zoom had different scale limits. | Both allow the same 280-3600 view width and direct gestures stop animated camera movement. | Desktop and mobile navigation now have consistent spatial boundaries. |
| Inspector and Noa drawers took 420-480ms. | Both settle in 280ms with 180ms opacity and shared drawer easing. | Repeated professional actions feel immediate while preserving spatial causality. |
| Pressable elements had no tactile active state. | Buttons and button-like links acknowledge activation with a 140ms `scale(.97)` response. | Feedback begins at the moment of input without shifting layout. |
| Reduced motion forced all transitions to near-zero duration. | Movement and continuous pulses stop, while color, border, focus, and opacity feedback remain. | Reduced motion stays understandable rather than becoming visually abrupt. |
| Transform hovers could run on coarse touch pointers. | Transform hover behavior is scoped to fine pointers with hover support. | Touch interactions no longer trigger desktop-only movement. |
| Noa had one static, generic mascot state. | Noa uses identity-preserving calm and attentive states, with a restrained idle breath only under no-preference. | The companion communicates review state without becoming a chatbot or decorative spectacle. |
| SVG edges animated stroke width. | Edge transitions are limited to opacity and color; active width changes are immediate. | This avoids a layout-style paint transition while retaining selected-path clarity. |

## Part 2: Verdict

### Tier 1: Feel-breaking issues

None found. Camera input is interruptible, drawers remain under 300ms, and no motion blocks legal or briefing content.

### Tier 2: Polish issues

None found in the consolidated verification. Active feedback begins immediately, shared easings are used consistently, and hover behavior is pointer-aware.

### Tier 3: Optional enhancements

The neural signal loop updates a bounded set of 38 SVG particles at a throttled 30fps. A CSS motion-path rewrite could be explored later, but it is not an easy equivalent because draggable node geometry changes every path in real time. The loop pauses visually when the document is hidden and does not run under reduced motion.

**Verdict: Approve.** The motion system is cohesive, responsive, interruptible, accessible, and appropriate for an expert intelligence workspace.
