# Deployment guide

The public production origin is `https://noa-energy-atlas.netlify.app`. The linked existing Netlify site ID is `ffdfa234-6474-4155-af51-7e08c6b6c3b9`; do not create a duplicate site.

Local release verification uses Node 22.19 or later:

```text
npm ci
npm run validate:content
npm test
npm audit --omit=dev --audit-level=high
npm run build
node scripts/verify-ui.mjs http://127.0.0.1:4323
```

`dist/` is the immutable static artifact. `scripts/postbuild.mjs` verifies critical outputs. A production deploy is atomic:

```text
npx netlify-cli deploy --prod --dir=dist --site=ffdfa234-6474-4155-af51-7e08c6b6c3b9
node scripts/smoke-production.mjs https://noa-energy-atlas.netlify.app <publication-id>
```

The production site is publicly readable. Team login, SSO protection, and password protection must remain disabled. Repository-native publication, required secrets, schedules, fail-closed validation, rollback, and monitoring are documented in `docs/automation.md`.
