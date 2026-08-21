# Market and news update agent

The complete operating mandate is `agents/lebanon-energy-market-intelligence.md`; its evidence rules and publishing contract are binding.

Run `npm run update:news` for the Tuesday/Friday cycle, `npm run update:daily` for a rolling daily check, or `npm run update:on-demand` for a narrow research cycle. Seed URLs are retrieved live, relevant current links are discovered and verified, source fingerprints are compared with persistent state, and an exact `Asia/Beirut` cutoff and coverage window are recorded.

If a structured-analysis provider is configured, the runner may prepare candidates conforming to `normalizedNewsCandidateSchema`. The runner rejects duplicates, unknown legal relationships, unverified publication candidates, unsupported numerical claims, unverified URLs and metadata that conflicts with the research packet. Without a provider, it produces an evidence packet and expert review queue only. Neither path publishes public content.
