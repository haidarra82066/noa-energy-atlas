# Reference repository audit

## Scope

The public reference implementation was cloned into `work/reference-energiewirtschaft-updates` and inspected without modifying it. The audit covered source structure, data shape, graph behaviour, filtering, detail views, update routines, service-worker behaviour, accessibility and responsive rendering.

## Inventory

The project is a dependency-free single-page application contained primarily in an approximately 300 KB `index.html`. It embeds 120 instrument nodes, 173 graph edges, 85 supplementary records and 12 news items. The instrument set spans 12 categories and three levels (41 EU, 66 German and 13 international records). Its 173 edges comprise 22 implementation, 12 amendment and 139 general relationship links.

The graph uses deterministic clustered force positioning. Selecting a node opens a detail panel with metadata, an explanatory “why relevant” note and source links. Substring search, category/level/type filters, local theme state, a service worker and a notification control are included. Navigation is network-first while assets are cache-first.

## Strengths retained

- A relationship map is the organising idea, not decoration.
- Individual records expose source links and an editorial explanation of relevance.
- Search and filters operate together and the layout retains a compact reference density.
- Offline/installable behaviour and update cadence are treated as product requirements.
- Deterministic graph positioning prevents a different layout on every load.

## Gaps addressed in Noa Energy Atlas

### Architecture and provenance

The monolithic inline data and rendering code make review, testing and partial reuse difficult. Updates rely on brittle text replacement and do not enforce a schema, referential integrity, claim dates, precision, confidence or a content cutoff. Noa Energy Atlas replaces this with TypeScript ledgers validated through Zod and tests. Sources, claims, instruments, relationships, metrics, updates and report reviews are separate record types.

### Editorial safety

The reference does not structurally distinguish an enacted law from an implementing process, a target from an outcome, or a modeled result from observed data. Noa Energy Atlas makes evidence type and precision mandatory and exposes caveats beside high-impact claims.

### Navigation and state

The reference search and graph selection are not durable deep links. Noa Energy Atlas gives each instrument a stable URL and mirrors instrument filters in the query string so a filtered view can be bookmarked and shared.

### Accessibility

The reference graph is effectively inaccessible to keyboard and screen-reader users; search results are clickable `div` elements, and focus management and modal semantics are incomplete. Its mobile graph remains fixed and cramped at 375 CSS pixels. The replacement uses semantic links and controls, visible focus, 44 px targets, an SVG with focusable linked nodes, and an equivalent relationship table. On narrow screens the table becomes the primary view.

### Operations and security

Noa Energy Atlas uses isolated repository-native jobs, strict deterministic evidence gates, direct typed-ledger integration, immutable GitHub Pages artifacts, automatic rollback, and public smoke verification. It does not depend on a chat or a human-review-only pull request.

## Decision

The relationship-centred concept, density, source visibility, offline support and update rhythm are carried forward. The single-file architecture, direct-to-main automation, emoji iconography, untyped records and graph-only interaction model are not.
