# Doc 6 · Implementation plan

Status: approved 2026-10-23. All six documents approved, so building may start.

Seven milestones and 11 vertical slices, starting with the riskiest part: scoring a 1,000,000-row file in a browser. Ideas that are "later, not v1" go in `backlog.md`.

## Milestones

| # | Milestone | Done when |
| --- | --- | --- |
| M0 | Workspace ready | Repo with `core`, `io`, `app` packages; Docs 1–6 in `/docs`; ADR-0001 to 0006; `LICENSE`, `CONTRIBUTING.md`, `AGENTS.md`; CI runs lint, type check, tests, the no-external-hosts check and the import-boundary check |
| M1 | Hardest part proven | A synthetic 1,000,000-row CSV streams through a Web Worker and is reduced to per-customer totals within the TRD target on the reference laptop; result recorded in ADR-0003; prototype deployed to GitHub Pages |
| M2 | Tracer bullet | Sample CSV → worker → quantile scores → plain list of segment counts on screen, through every package |
| M3 | Core workflow | Slices S1–S6: upload to exported segment works end to end |
| M4 | Privacy and safety | CSP in place; formula escaping on export; file validation; Delete all data; dependency and static-analysis scans in CI |
| M5 | Hardening | Slices S7–S11; every state from APP_FLOW.md; WCAG AA contrast; 100k-row benchmark in CI; diagnostics panel; README and "How scores work"; first usability round |
| M6 | Staged release | v0.x shared with 5–10 early-tester merchants; feedback triaged; then v1.0 public; rollback = redeploy previous tag |

## Vertical slices (build order)

| Slice | PRD story | What ships | Proof it works |
| --- | --- | --- | --- |
| S1 Upload and preview | 1 | Streaming CSV (and XLSX, if ADR-0006 resolves it) preview | Integration test per sample; malformed-file tests |
| S2 Column mapping | 2 | Shopify, WooCommerce and generic presets | Each preset maps its anonymised sample |
| S3 Cleaning and settings | 3 | Status filters, gross/net, refunds, analysis date | Excluded counts match a hand-counted fixture |
| S4 Scoring rules | 4 | TRD §8 in full | Putler 15-customer golden fixture; tie and one-time-buyer property tests |
| S5 Default map and grid | 5 | SCHEMA.md default map; grid with counts and revenue shares | Grid totals equal cleaned totals |
| S6 Segment detail and export | 7 | Customer list; safe CSV export | Formula-escaping test; CSV opens in a spreadsheet |
| S7 Segment rules editor | 6 | Edit, validate, undo, reset | 125-cell coverage test; undo test |
| S8 Local persistence | 9 | IndexedDB; migration 001 | Reload keeps data; migration fixture test |
| S9 Project files | 9 | Save and open project files | Round-trip test; old-version test |
| S10 Movement | 8 | From-to table between snapshots | Counts match a hand-built fixture |
| S11 Onboarding and sample data | — | Three questions; one-click sample | Golden path under 5 minutes in a usability test |

## The loop for every slice

1. Short spec: scope, out of scope, steps, files to change, a 5–20 line test recipe.
2. Maintainer reviews and approves.
3. Tests first, then code, one step at a time.
4. Maintainer runs the tests and sees them pass.
5. Maintainer reviews the diff, including deletions and any disabled tests.
6. Ask "How could someone break this?", e.g. with a hostile file.
7. Clean up debug output, dead code, temporary files.
8. Commit with a message explaining why; fresh AI session for the next slice.

## What the AI may do

| Level | Actions |
| --- | --- |
| Forbidden | Publishing a release; pushing to `main`; using real merchant data |
| Needs approval | New dependency; new migration; scoring rules or default map changes; CSP changes |
| Allowed, logged | Editing code and tests on a branch; opening a pull request |
| Autonomous | Running tests, lint and type checks locally |

## Definition of done for every slice

- [ ] Acceptance criteria met, with test evidence in the pull request
- [ ] Tests, lint, type check and scans pass in CI
- [ ] Maintainer can explain every changed line
- [ ] Docs updated; maintainer approved the merge

## Backlog (later, not v1)

Command-line tool and npm release of `core`; Shopify or WooCommerce connectors via an optional self-hosted server; segment rules using M by default; customer lifetime value; multiple currencies; other languages; export presets for specific email tools.
