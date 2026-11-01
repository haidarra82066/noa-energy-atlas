# Production intelligence automation

## Isolation architecture

Publication is repository-native. Each research run starts in the configured Codex Cloud environment from current `origin/main`, retrieves primary evidence using built-in browsing, and pushes a scoped release branch after all gates pass. A fresh GitHub Actions VM validates that branch and publishes one immutable artifact to GitHub Pages. No external model API key is required for these cloud research tasks. No publishing run reads a Codex task, chat transcript, or accumulated heartbeat context.

News and legal processing are separate workflows with separate root concurrency groups (`noa-news-intelligence`, `noa-legal-intelligence`), source windows, fetch limits, state files, candidates, evidence packets, memory, timeouts, retry delays, and failure artifacts. All production deployments, including ordinary site releases, share `noa-production-publication`, so they cannot overlap or race. A failed run cannot mutate the other workflow's state, and GitHub Pages receives no candidate artifact until the complete build passes.

Continuity lives in version control:

- `updates/state/news.json` and `updates/state/law.json`: fingerprints, last fully released run, and last scheduled Beirut date. Research writes `updates/pending-state/` first; promotion occurs only after a successful public smoke test or a validated no-op.
- `updates/research/*-evidence.json`: exact retrieved evidence and run cutoff.
- `updates/candidates/news.json` and `updates/candidates/law.json`: schema-validated bounded candidates.
- `updates/memory/`: concise watchlist, source preferences, gaps, assumptions, and prior briefing outcomes.
- `updates/publication-ledger-news.jsonl` and `updates/publication-ledger-law.jsonl`: separate immutable decision/provenance lines.
- `src/data/automated-publications.json`: the automated production ledger consumed by Astro.

Cloud research uses bounded source packets and the repository source coverage gates. Evidence, rejected candidates and exact cutoffs are saved in the repository; accumulated chat history is not an evidence source. GitHub job timeouts are 50 minutes for news and 60 minutes for law. Network collection retries once; public deployment polling is bounded to four minutes.

## Schedules and daylight saving time

The editorial timezone is `Asia/Beirut`.

- News: Tuesday and Friday at 08:23 Beirut time.
- Law and policy: exactly the 1st and 15th of every month at 08:41 Beirut time.

ChatGPT tasks store the editorial schedule with `TZID=Asia/Beirut`, preserving daylight saving changes. News pushes `automation/news-release/**`; legal research pushes `automation/legal-release/**`. Neither publication workflow has a competing cron. Cloud tasks check the editorial date and promoted state, accept delayed starts later that date, and suppress completed dates. See [Cloud legal publisher](cloud-law-publisher.md) for the complete legal procedure. A separate daily ChatGPT health check runs at 08:00 Europe/Berlin, stays quiet when unchanged, and checks actual research completion rather than the workflow badge.

## Strict auto-publication policy

There is no human-review-only pull-request bottleneck. Publication remains fail-closed:

1. Sources must be retrieved successfully in the current 3–5 day window. Critical-source gates require at least 60% priority-one availability plus mode-specific government, grid, legislation-index, standards, and climate/research coverage.
2. Candidates must satisfy the Zod contracts and use only retrieved URLs.
3. News must be High confidence, Confirmed or Under implementation, locator-backed, and independently corroborated where required.
4. Legal or policy news must use a controlling official primary source.
5. Legal ledger changes must use priority-one controlling sources, include complete bilingual professional detail, pass amendment and implementation checks, and record status and corrections.
6. IDs, source references, graph endpoints, Arabic localization, claims, relationships, and original legal records must resolve.
7. Content validation, tests, production dependency audit, Astro diagnostics, static build, and post-build checks must all pass.
8. GitHub Pages deploys only the already-built immutable artifact. The public smoke test must observe the exact publication marker and verify the graph, updates, instruments, relationship ledger, and manifest routes.

A candidate that misses any condition is logged as rejected. Zero accepted candidates is a successful no-op: operational state may be committed with `[skip pages]`, and no deployment occurs.

## Secrets and repository settings

The cloud tasks use their configured environment and connected GitHub access. The legacy manual `update:laws` / `update:news` scripts still require an external provider if explicitly invoked, but scheduled cloud publication does not call them. Missing cloud access, source retrieval or validation is a failure, not a quiet period.

GitHub Pages deployment uses the short-lived repository `GITHUB_TOKEN` and OIDC; there is no hosting-provider token. Workflows request only the permissions they need: ordinary deploys use `contents: read`, `pages: write`, and `id-token: write`; intelligence releases add `contents: write` and `actions: read`. Secrets are never written to evidence, artifacts, the client bundle, logs, or version control. Scheduled workflows and Pages must remain enabled.

## Failure, rollback, monitoring, and escalation

Before deploying changed public content, each release workflow builds the current `main` revision as a rollback artifact. The release commit remains on its isolated release branch until the candidate artifact is deployed and its exact marker passes public smoke checks. Only then is pending state promoted and the release commit pushed to `main`. If smoke, state promotion, or final push fails after deployment, the workflow redeploys the prebuilt rollback artifact and verifies its prior marker. Never edit `automated-publications.json` partially; the integrator validates the complete ledger and atomically renames a temporary file only after success.

Automated publication commits include `[skip pages]` because the workflow has already deployed and verified that artifact. This prevents the ordinary push workflow from racing the release. Ordinary product and documentation commits are built, tested, audited, deployed, and smoke-tested by `.github/workflows/pages.yml`.

News and law have explicit file allowlists. The shared production ledger is protected by `noa-production-publication`; mode-specific publication decisions remain in separate ledgers. Legal releases retain immutable before/after payloads, hashes, supersession chains, controlling-source IDs, consolidated-text tracking, translation-review identity, status history, and correction history in `legalVersions`.

Failures retain bounded evidence artifacts for 14 days (news) or 30 days (law). Check GitHub Actions, the mode-specific publication ledger, the failure artifact, the `github-pages` deployment environment, and the public marker. Escalate unsupported legal changes to a qualified Lebanese legal reviewer; never lower confidence thresholds. Correct the source or configuration, then prepare a new scoped cloud release from current main.

Cloud research tasks follow version-controlled procedures in fresh checkouts. The health-check task is read-only and must not research, integrate or publish. Production deployment remains in GitHub Actions; no run relies on accumulated chat memory.
