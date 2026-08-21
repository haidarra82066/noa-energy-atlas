# Deployment guide

The public production URL is `https://haidarra82066.github.io/noa-energy-atlas/`. GitHub Pages is built from the public repository `https://github.com/haidarra82066/noa-energy-atlas` by `.github/workflows/pages.yml`; no external hosting account or deploy token is required.

Local release verification uses Node 22.19 or later:

```text
npm ci
npm run validate:content
npm test
npm audit --omit=dev --audit-level=high
$env:URL='https://haidarra82066.github.io'
$env:BASE_PATH='/noa-energy-atlas'
npm run build
```

`dist/` is the immutable static artifact. `scripts/postbuild.mjs` verifies critical outputs. The workflow then uploads `dist/` using `actions/upload-pages-artifact`, deploys it with `actions/deploy-pages`, and verifies the public marker:

```text
node scripts/smoke-production.mjs https://haidarra82066.github.io/noa-energy-atlas <publication-id>
```

The Pages site is publicly readable. Team login, SSO protection, and password protection do not apply. The project path `/noa-energy-atlas` is set through `BASE_PATH`; navigation, canonical URLs, the service worker, icons, RSS, sitemap, and PWA manifest all preserve that prefix.

For rollback, open the failed GitHub Actions run and inspect the automatic rollback step. Scheduled intelligence runs upload both the candidate artifact and a prebuilt artifact from the prior `main` revision; any post-deploy failure restores and smoke-tests the latter. Repository-native schedules, strict validation, secrets, source hierarchy, and escalation are documented in `docs/automation.md`.
