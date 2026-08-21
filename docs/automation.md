# Production intelligence automation

## Isolation architecture

Publication is repository-native. Each run starts in a fresh GitHub Actions VM from the current `main` branch, installs locked dependencies, reads bounded evidence and version-controlled state, writes typed production data, validates the complete site, and publishes one immutable artifact to GitHub Pages. No publishing run reads a Codex task, chat transcript, or accumulated heartbeat context.

News and legal processing are separate workflows with separate root concurrency groups (`noa-news-intelligence`, `noa-legal-intelligence`), source windows, fetch limits, state files, candidates, evidence packets, memory, timeouts, retry delays, and failure artifacts. All production deployments, including ordinary site releases, share `noa-production-publication`, so they cannot overlap or race. A failed run cannot mutate the other workflow's state, and GitHub Pages receives no candidate artifact until the complete build passes.

Continuity lives in version control:

- `updates/state/news.json` and `updates/state/law.json`: fingerprints, last fully released run, and last scheduled Beirut date. Research writes `updates/pending-state/` first; promotion occurs only after a successful public smoke test or a validated no-op.
- `updates/research/*-evidence.json`: exact retrieved evidence and run cutoff.
- `updates/candidates/news.json` and `updates/candidates/law.json`: schema-validated bounded candidates.
- `updates/memory/`: concise watchlist, source preferences, gaps, assumptions, and prior briefing outcomes.
- `updates/publication-ledger-news.jsonl` and `updates/publication-ledger-law.jsonl`: separate immutable decision/provenance lines.
- `src/data/automated-publications.json`: the automated production ledger consumed by Astro.

The model sees at most 36 news sources with 5,500 excerpt characters each or 20 priority-one legal sources with 8,000 characters each. It receives no prior chat history. GitHub job timeouts are 50 minutes for news and 60 minutes for law. Network collection retries once; public deployment polling is bounded to four minutes.

## Schedules and daylight saving time

The editorial timezone is `Asia/Beirut`.

- News: Tuesday and Friday at 08:23 Beirut time.
- Law and policy: exactly the 1st and 15th of every month at 08:41 Beirut time.

GitHub cron is UTC and cannot express an IANA timezone. Each workflow schedules both possible Beirut offsets (`05` and `06` UTC). `scripts/schedule-guard.ts` accepts only the invocation whose local Beirut hour is 08 and suppresses the other using `lastScheduledDate`. During UTC+3 daylight time, 05 UTC runs; during UTC+2 standard time, 06 UTC runs. Manual dispatch bypasses the calendar gate but never bypasses evidence or publication gates.

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

The only required GitHub Actions secret is `INTELLIGENCE_API_KEY`. Required repository variables are `INTELLIGENCE_BASE_URL` and `INTELLIGENCE_MODEL`. The provider must expose an OpenAI-compatible `/chat/completions` endpoint with structured JSON output. Provider absence, retirement, outage, invalid output, or schema mismatch fails research before integration; it cannot be interpreted as a quiet period.

GitHub Pages deployment uses the short-lived repository `GITHUB_TOKEN` and OIDC; there is no hosting-provider token. Workflows request only the permissions they need: ordinary deploys use `contents: read`, `pages: write`, and `id-token: write`; intelligence releases add `contents: write` and `actions: read`. Secrets are never written to evidence, artifacts, the client bundle, logs, or version control. Scheduled workflows and Pages must remain enabled.

## Failure, rollback, monitoring, and escalation

Before research mutates a workspace, each scheduled workflow builds the current `main` revision as a rollback artifact. The release commit remains local until the candidate artifact is deployed and its exact marker passes public smoke checks. Only then is pending state promoted and the release commit pushed to `main`. If smoke, state promotion, or final push fails after deployment, the workflow redeploys the prebuilt rollback artifact and verifies its prior marker. Never edit `automated-publications.json` partially; the integrator validates the complete ledger and atomically renames a temporary file only after success.

Automated publication commits include `[skip pages]` because the workflow has already deployed and verified that artifact. This prevents the ordinary push workflow from racing the release. Ordinary product and documentation commits are built, tested, audited, deployed, and smoke-tested by `.github/workflows/pages.yml`.

News and law have explicit file allowlists. The shared production ledger is protected by `noa-production-publication`; mode-specific publication decisions remain in separate ledgers. Legal releases retain immutable before/after payloads, hashes, supersession chains, controlling-source IDs, consolidated-text tracking, translation-review identity, status history, and correction history in `legalVersions`.

Failures retain bounded evidence artifacts for 14 days (news) or 30 days (law). Check GitHub Actions, the mode-specific publication ledger, the failure artifact, the `github-pages` deployment environment, and the public marker. Escalate unsupported legal changes to a qualified Lebanese legal reviewer; never lower confidence thresholds. Correct the source or configuration, then re-run through `workflow_dispatch`.

Any Codex automation should be a lightweight monitor or notification only. It must not research, integrate, build, or publish. No production publication depends on an overfilled chat.
