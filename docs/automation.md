# Production intelligence automation

## Isolation architecture

Publication is repository-native. Each run starts in a fresh GitHub Actions VM from the current `main` branch, installs the locked dependencies, reads bounded source evidence and version-controlled state, writes typed production data, validates the complete site, and publishes the immutable `dist/` artifact to the existing Netlify site. No publishing run reads a Codex task, chat transcript, or accumulated heartbeat context.

News and legal processing are separate workflows with separate root concurrency groups (`noa-news-intelligence`, `noa-legal-intelligence`), source windows, fetch limits, state files, candidates, evidence packets, memory, timeouts, retry delays, and failure artifacts. Their production jobs additionally share the job-level group `noa-production-publication`, so a news and legal publication cannot overlap or race. One failure cannot mutate the other workflow's candidate or state files, and Netlify receives no artifact until the full build passes.

Continuity lives in version control:

- `updates/state/news.json` and `updates/state/law.json`: fingerprints, last fully released run, and last scheduled Beirut date. Research writes `updates/pending-state/` first; promotion occurs only after a successful public smoke test, or after a validated no-op.
- `updates/research/*-evidence.json`: exact retrieved evidence and run cutoff.
- `updates/candidates/news.json` and `updates/candidates/law.json`: schema-validated bounded candidates.
- `updates/memory/`: concise watchlist, source preferences, gaps, assumptions, and prior briefing outcomes.
- `updates/publication-ledger-news.jsonl` and `updates/publication-ledger-law.jsonl`: separate immutable decision/provenance lines.
- `src/data/automated-publications.json`: the only automated production ledger consumed by Astro.

The model sees at most 36 news sources with 5,500 excerpt characters each or 20 priority-one legal sources with 8,000 characters each. It receives no prior chat history. GitHub job timeouts are 45 minutes for news and 55 minutes for law. Network collection retries once; deployment smoke polling is bounded to four minutes.

## Schedules and daylight saving time

The editorial timezone is `Asia/Beirut`.

- News: Tuesday and Friday at 08:23 Beirut time.
- Law and policy: exactly the 1st and 15th of every month at 08:41 Beirut time.

GitHub cron is UTC and cannot express an IANA timezone. Each workflow therefore schedules both possible Beirut offsets (`05` and `06` UTC). `scripts/schedule-guard.ts` accepts only the invocation whose local Beirut hour is 08 and suppresses the second using `lastScheduledDate`. During UTC+3 daylight time, the 05 UTC invocation runs; during UTC+2 standard time, the 06 UTC invocation runs. A manual dispatch bypasses the calendar gate but not evidence or publication gates.

## Strict auto-publication policy

There is no human-review-only pull-request bottleneck. Publication remains fail-closed:

1. Sources must be retrieved successfully in the current 3-5 day window. Critical-source gates require at least 60% priority-one availability plus mode-specific government, grid, legislation-index, standards, and climate/research coverage.
2. Candidates must satisfy the Zod contracts and use only retrieved URLs.
3. News must be High confidence, Confirmed or Under implementation, locator-backed, and independently corroborated when the existing validator requires it.
4. Legal or policy news must use a controlling official primary source.
5. Legal ledger changes must use priority-one controlling sources, include complete bilingual professional detail, pass amendment and implementation checks, and record status and corrections.
6. IDs, source references, graph endpoints, Arabic localization, claims, relationships, and original legal records must resolve.
7. Content validation, tests, production dependency audit, Astro diagnostics, static build, and post-build checks must all pass.
8. Netlify deploys the already-built directory atomically. The public smoke test must observe the exact publication marker and verify the graph, updates, instruments, relationship ledger, and manifest routes.

A candidate that misses any condition is logged as rejected. Zero accepted candidates is a successful no-op: operational state may be committed, `netlify-ignore.mjs` skips state-only continuous builds, and no production deploy occurs.

## Secrets and repository settings

Required GitHub Actions secrets:

- `INTELLIGENCE_API_KEY`
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID` set to the existing Noa Energy Atlas site ID `ffdfa234-6474-4155-af51-7e08c6b6c3b9`

Required repository variables are `INTELLIGENCE_BASE_URL` and `INTELLIGENCE_MODEL`. The provider must expose an OpenAI-compatible `/chat/completions` endpoint with structured JSON output. Provider absence, retirement, outage, invalid output, or schema mismatch fails the research step before integration; it cannot be interpreted as a quiet period.

Secrets are read only by the job that needs them and are never written to evidence, artifacts, the client bundle, logs, or version control. The workflow token has only `contents: write` and `actions: read`; pull-request, issue, package, and administration permissions are absent. The repository must allow GitHub Actions to write contents to `main`, and scheduled workflows must be enabled.

## Failure, rollback, monitoring, and escalation

The release commit remains local until the built artifact is deployed and its exact marker passes public smoke checks. Only then is pending state promoted and the release commit pushed to `main`. If smoke, state promotion, or the final push fails after deployment, the workflow restores the captured prior Netlify deploy through the official restore endpoint. Netlify deploys are immutable, so manual rollback can also republish the prior successful deploy. Never edit `automated-publications.json` partially; the integrator validates the complete ledger and renames an atomic temporary file only after success.

The existing Netlify site is connected to `haidarra82066/noa-energy-atlas`, branch `main`, for ordinary continuous deployment. Automated publication commits include `[skip netlify]` because those workflows have already deployed and smoke-tested the exact immutable artifact before pushing; this prevents a redundant webhook build from racing the verified release. Ordinary product and documentation commits continue to use Netlify continuous deployment.

News and law have explicit file allowlists checked before release. The shared production ledger is protected by `noa-production-publication`; mode-specific publication decisions remain in separate ledgers. Legal releases additionally retain immutable before/after payloads, content hashes, supersession chains, controlling-source IDs, consolidated-text tracking status, translation-review identity, status history, and correction history in `legalVersions`.

Failures retain bounded evidence artifacts for 14 days (news) or 30 days (law). Check GitHub Actions status, the mode-specific publication ledger, the failure artifact, Netlify deploy logs, and the public marker. Escalate unsupported legal changes to a qualified Lebanese legal reviewer; do not lower the confidence threshold. Re-run through `workflow_dispatch` after correcting the source or configuration.

Any Codex automation should be a lightweight monitor or notification only. It must not research, integrate, build, or publish. Once these repository workflows are active, redundant chat heartbeat publishers should be disabled.
