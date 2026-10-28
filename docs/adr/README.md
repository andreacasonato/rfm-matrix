# Architecture decision records

Each significant decision is recorded here, so nobody, human or AI, has to guess why later.
Format follows the Production-Grade App Playbook: title, status, context, decision,
consequences, governance, notes.

| ADR | Decision | Status |
| --- | --- | --- |
| [0001](0001-local-first-static-app.md) | Local-first static app, no server | Accepted |
| [0002](0002-modular-monolith-packages.md) | Modular monolith: `core`, `io`, `app` | Accepted |
| [0003](0003-scoring-in-web-worker.md) | Parsing and scoring in a Web Worker | Accepted, confirmed by M1 benchmark |
| [0004](0004-scoring-method.md) | Quantile scores with value-based ties; fixed frequency breaks | Accepted |
| [0005](0005-mit-license.md) | MIT license | Accepted |
| [0006](0006-libraries-and-versions.md) | Libraries, pinned versions and licenses | Accepted, XLSX parser open |
| [0007](0007-dev-tooling.md) | Dev tooling: Biome, type packages, CI actions | Accepted |
| [0008](0008-papaparse-types.md) | Type definitions for Papa Parse | Accepted |
| [0009](0009-pages-deploy.md) | Manually triggered GitHub Pages deploy | Accepted |
| [0010](0010-percentiles-and-days.md) | Percentile method and day counting | Accepted |
| [0011](0011-ui-dependencies-and-csv-only.md) | UI dependencies, CSV-only import, no router | Accepted |
| [0012](0012-column-mapping-rules.md) | Column mapping: amounts, dates, customer keys, presets | Accepted |
| [0013](0013-cleaning-and-refunds.md) | Cleaning rules, refunds, net amounts, analysis window | Accepted |
| [0014](0014-export-and-segment-texts.md) | Safe CSV export and the default segment texts | Accepted |
| [0015](0015-content-security-policy.md) | Content-Security-Policy as a meta tag, with Trusted Types | Accepted |
| [0016](0016-security-scans.md) | Dependency and static-analysis scans in CI | Accepted |
| [0017](0017-file-size-limit.md) | A 320 MB file size limit, and out-of-memory errors | Accepted |
| [0018](0018-storage-and-accessibility-test-tools.md) | Test tools for storage and accessibility | Accepted |
| [0019](0019-snapshot-records.md) | How a snapshot is saved: file fingerprint, extra fields, one transaction | Accepted |
| [0020](0020-offline-service-worker.md) | Offline after first load, with a hand-written service worker | Accepted |

## Template

```markdown
# ADR-NNNN: Title

- Status: Proposed | Accepted | Superseded by ADR-NNNN
- Date: YYYY-MM-DD

## Context
## Decision
## Consequences
## Governance (how the decision is enforced)
## Notes
```

A decision is changed by writing a new ADR that supersedes the old one, never by editing an accepted ADR.
