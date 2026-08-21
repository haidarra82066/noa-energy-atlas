# Animation improvement plans

| Plan | Title | Severity | Status |
| --- | --- | --- | --- |
| 001 | Unify the motion language | MEDIUM | DONE |
| 002 | Make the graph camera interruptible | HIGH | DONE |
| 003 | Refine panels and press feedback | MEDIUM | DONE |
| 004 | Preserve feedback under reduced motion | HIGH | DONE |

## Recommended order

1. `001` establishes the tokens used by every later plan.
2. `004` establishes the accessibility boundaries.
3. `002` fixes the highest-frequency graph motion.
4. `003` adds final physical feedback and the stateful Noa companion.

Plans `002` and `003` depend on the tokens introduced by `001`.
