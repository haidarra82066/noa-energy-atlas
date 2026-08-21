# Architecture decision record

## ADR-001: Static-first Astro with typed ledgers

**Status:** accepted, 16 August 2026.

**Decision:** generate the public site with Astro in static output mode. Store editorial records as typed TypeScript arrays validated with Zod. Add client JavaScript only for filters, search, theme, navigation and PWA installation.

**Why:** legal and market reference pages benefit from stable URLs, inspectable HTML, low bandwidth, simple hosting and strong cache behaviour. The content needs relational validation but not a database at this scale. Static generation also creates a narrow security surface and permits an offline cache.

**Consequences:** every accepted publication rebuilds the site. Scheduled monitors write a separate typed automated ledger that Astro consumes directly; state-only no-op commits skip GitHub Pages deployment. If the ledger outgrows the repository, the schemas remain a migration contract for a database or headless CMS.

## ADR-002: Relationship SVG plus table

**Status:** accepted.

**Decision:** render a deterministic, category-clustered SVG workspace with linked nodes, zoom, pan, search and a record inspector, followed by an equivalent semantic table. Keep both views available at narrow widths, with visible controls as an alternative to gestures.

**Why:** relationships are central to comprehension, but force graphs create unstable geometry, pointer dependence and poor mobile/accessibility outcomes. A deterministic overview serves visual scanning while the table remains the authoritative interaction path.

## ADR-004: One bilingual LTR/RTL application shell

**Status:** accepted.

**Decision:** publish English and Arabic through one static route set. Curated locale records contain domain terminology and original Arabic legal names; the client switches visible copy and document direction without duplicating the source ledger.

**Why:** one relational model prevents English and Arabic legal status from drifting, while an explicit locale layer allows terminology to receive the editorial review that generic machine translation cannot provide. Deep links, sources, IDs and update dates remain identical in both modes.

## ADR-003: Human-gated automation

**Status:** accepted.

**Decision:** isolated source monitors hash retrieved pages and create bounded structured candidates. A separate deterministic gate admits only High-confidence, current-run, source-backed records to production, validates the complete site, publishes atomically, and smoke-tests the exact deploy. The workflows write directly to `main`; no pull request is required.

**Why:** a changed HTML fingerprint signals review, not a legal conclusion. Secondary rules, translations, project stages and conflicting metrics require editorial judgment.
