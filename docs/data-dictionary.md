# Data dictionary

| Ledger | Required identity | Key evidence fields | Purpose |
| --- | --- | --- | --- |
| Source | `src-*` | publisher, URL, publication/access dates, language, kind | Provenance record for every public claim or relationship. |
| Claim | `clm-*` | source ids, as-of date, evidence type, confidence, precision, caveat | A single reviewable factual or scenario statement. |
| Instrument | `ins-*`, slug | category, status, summary, relevance, sources, claims, review date | Law, policy, institution, commitment or project record. |
| Relationship | `rel-*` | from/to instrument ids, typed relation, label, sources | Directed, sourced connection between instruments. |
| Metric | `met-*` | value, unit, period, segment, precision, evidence type, sources | Numerically comparable market or policy datum. |
| News | `news-*`, slug | date, summary, significance, sources, affected instruments, tags | Dated public change log. |
| Report | `rep-*` | method, useful-for, limits, evidence class, source | Critical method note for a supplied or admitted study. |

## Controlled meanings

- `exact`: copied from a source without rounding; not a statement that the source itself is error-free.
- `estimate`: presented as approximate, provisional or method-dependent.
- `scenario`: conditional modeled or planned pathway.
- `high confidence`: a direct, unambiguous primary source supports the statement.
- `medium confidence`: a reliable source supports the statement but method, estimate or interpretation introduces material uncertainty.
- `under implementation`: the instrument exists, while important secondary rules, capacity or transactions remain incomplete.
