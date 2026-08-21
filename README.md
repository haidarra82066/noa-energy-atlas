# Noa Energy Atlas

An English–Arabic reference to Lebanon’s energy laws and consequential sector updates through 16 August 2026. The primary experience is a source-backed neural law map with organic fields, animated legal relationships, contextual dossiers and a concise energy briefing maintained by Noa. Arabic mode uses RTL layout and the original official Arabic names of laws and instruments when available.

## Commands

- `npm run dev` — local development server
- `npm run validate:content` — schemas, ids, references and cutoff checks
- `npm test` — ledger invariants
- `npm run check` — Astro and TypeScript diagnostics
- `npm run build` — validated production build
- `npm run audit:links` — internal route and URL-shape check
- `npm run update:laws` / `npm run update:news` — refresh the source-review registers
- `npm run update:daily` / `npm run update:on-demand` — daily or narrow intelligence cycles

The editorial methodology is public at `/methodology/`. The intelligence mandate is in `agents/lebanon-energy-market-intelligence.md`; architecture, data, audit and deployment notes are in `docs/`.
