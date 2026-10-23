# Doc 1 · Product Requirements Document (PRD)

Status: approved 2026-10-23. Source: RFM Matrix — Project Documents (Docs 1–6).

Build a free tool that shows a small e-commerce store, in under five minutes, which repeat customers are its best, which are slipping and which are lost, with every rule visible.

## Approved decisions

| # | Decision | Rejected alternative |
| --- | --- | --- |
| D1 | Local-first: the app runs entirely in the browser, hosted as static files. No backend, no database server, no accounts | Self-hosted server (FastAPI + PostgreSQL in Docker) |
| D2 | The scoring engine is a separate TypeScript package with no UI code | Engine written inside the app |
| D3 | MIT license | AGPL-3.0 |
| D4 | v1 input is file upload only (CSV, XLSX). No platform API connectors; connectors stay in the backlog | Shopify/WooCommerce API connectors |

## 1. Problem and success metrics

Small stores with repeat buyers have the data to find slipping customers but not the tools. Paid tools exist (RFM Calc starts at £19/month, https://www.rfmcalc.com/; Putler's plan with RFM is $79/month, https://www.putler.com/blog/rfm-analysis/), while free code projects mostly need programming skills. Existing segment rules can also be unclear: readers of Putler's guide asked which segment a score belongs to when several overlap.

| Metric | Type | Target |
| --- | --- | --- |
| Scoring correctness | Technical | 100% of reference test fixtures match expected scores and segments |
| Segment map completeness | Technical | All 125 R×F×M combinations map to exactly one segment |
| Time to first grid | Technical | Under 5 minutes from opening the app to seeing the grid, for a first-time user |
| Processing speed | Technical | 1,000,000 order rows scored in under 60 s on a mid-range laptop (proven in M1) |
| Real-world use | Adoption | 25 merchants report running it on their own data within 3 months of launch |
| Action taken | Outcome | 5 merchants report sending a campaign to an exported segment |

Adoption targets can only be measured through voluntary feedback, because the app sends no data anywhere (D1).

## 2. Users and ICP

**Assumption (untested; Phase 0 interviews were skipped by the maintainer's decision):** a solo owner or small team running a Shopify or WooCommerce store, with roughly 500 to 50,000 customers, where repeat purchase is normal (consumables, apparel, coffee, cosmetics). They export orders to spreadsheets, use an email tool such as Klaviyo or Mailchimp, and don't want to pay for or upload customer data to a customer data platform.

Job they hire the tool for: "Tell me who to email this week, and why."

Not the ICP: stores where most customers buy once; B2B wholesalers (possible later).

## 3. One-sentence promise and positioning

> I help small e-commerce store owners see who their best, slipping and lost repeat customers are in under 5 minutes, for free, without uploading their customer data anywhere.

| Alternative | Where we must be better |
| --- | --- |
| A spreadsheet | Speed, repeatability, segment-movement history |
| Free Shopify segmentation apps | Transparent, editable rules; works with any platform's export; data stays local |
| Paid tools (RFM Calc, Putler, DataHub Pro) | Free, open, private; we don't compete on breadth of reports |

## 4. Scope

**In (v1):** CSV and XLSX order upload (XLSX pending ADR-0006); column mapping with presets; data cleaning options; R, F, M scoring with quintiles or fixed thresholds; an editable 125-cell segment map; the RFM grid; segment detail lists; per-segment CSV export; saved snapshots and segment movement between two snapshots; project save/load as a file; English UI; light and dark themes.

**Out (v1), on purpose:** platform API connectors; any server, accounts or cloud sync; scheduled refresh; sending emails or syncing to ad platforms; AI or predictive models (CLV, churn probability); multi-currency conversion; mobile-first layout (must work on a phone, desktop is primary); languages other than English.

## 5. User stories with acceptance criteria

1. **Upload.** As a store owner, I want to upload my order export so that I don't have to reformat it.
   - Given a CSV or XLSX file under the size limit, When I drop it on the upload screen, Then I see a preview of its first 20 rows within 5 s.
2. **Map columns.** As a store owner, I want the app to guess which columns are customer, date and amount so that setup is quick.
   - Given a Shopify-format export, When the preview loads, Then the customer, date and amount columns are pre-selected and I can change any of them.
3. **Clean.** As a store owner, I want to exclude refunds, cancelled orders and test orders so that scores reflect real buying.
   - Given a status column, When I tick "exclude cancelled", Then those rows are removed and the excluded count is shown.
4. **Score.** As a store owner, I want each customer scored 1–5 on R, F and M so that I can compare them.
   - Given cleaned orders and an analysis date, When I run the analysis, Then every customer gets R, F and M scores and a segment, and the method used is shown on screen.
5. **See the grid.** As a store owner, I want one grid showing how many customers and how much revenue sit in each segment.
   - Given a finished analysis, When the grid loads, Then each segment shows customer count, share of customers and share of revenue, and the totals equal the cleaned data.
6. **Edit rules.** As a store owner, I want to see and change which scores belong to which segment.
   - Given the segment map, When I reassign a cell, Then the grid recalculates and the map still covers all 125 combinations exactly once.
7. **Export.** As a store owner, I want a CSV of one segment so that I can upload it to my email tool.
   - Given a segment with customers, When I click "Export", Then a CSV downloads with customer ID, email (if mapped), R, F, M values, scores and segment.
8. **Track movement.** As a store owner, I want to compare this month with last month so that I see who slipped.
   - Given two saved snapshots, When I open "Movement", Then I see how many customers moved from each segment to each other segment.
9. **Keep my work.** As a store owner, I want to save my project to a file and reopen it later.
   - Given a project with snapshots, When I save and reopen it on the same or another computer, Then settings, mapping and snapshots are restored.

## 6. Edge, failure and security cases

| Feature | Edge cases | Failure modes | Security case |
| --- | --- | --- | --- |
| Upload | Semicolon delimiter; non-UTF-8 encoding; dates in DD/MM vs MM/DD | File too large for browser memory; corrupt XLSX | Cells starting with `=` must never execute |
| Column mapping | No email column; gross and net amount columns; one row per line item | Required column missing | — |
| Scoring | All customers bought once; ties across quintile edges; negative totals after refunds | Fewer than 5 customers | — |
| Segment map | Cell left unassigned | Imported map file malformed | Script text in an imported map shown only as plain text |
| Export | Names with commas, quotes, non-Latin letters | Browser blocks download | Cells starting with `=`, `+`, `-` or `@` are escaped |
| Project file | Old file version | Hand-edited invalid file | File validated before loading; no code from it executed |

## 7. Non-functional summary (detail in TRD)

- **Privacy:** order data never leaves the device; no network requests after loading.
- **Speed:** visible progress for any step over 1 s; the UI never freezes during scoring.
- **Reliability:** works offline after first load.
- **Trust:** every number on screen traces to a rule the user can read.
- **Cost:** zero running cost beyond free static hosting.

## 8. AI behaviour

None in v1. RFM is plain arithmetic.

## 9. MVP cut

Core workflow: upload → map → score → grid → export one segment. Movement (story 8) and project files (story 9) come second.

## 10. Pricing

Free and open source under MIT. No tiers, trial or payments. Open question: a sustainability route later, such as donations.

## 11. North Star and golden path

North Star: a merchant exports at least one segment from their own data. Golden path: upload → grid → export in under 5 minutes. A sample dataset reaches the grid in under 1 minute.

## 12. Risks and open questions

| Risk | Mitigation |
| --- | --- |
| Browser runs out of memory on large files | Prove 1M rows in M1; stream parsing; clear size limit |
| Export formats differ by platform and change | Column-mapping presets as data files, tested against anonymised exports |
| Users misread scores as predictions | Plain-language note that RFM is historical |
| No usage data (no telemetry) | Feedback link, GitHub issues, early-tester feedback in M6 |
| Project abandoned after launch | Small scope, good tests and docs |

Open questions: final name; hosted demo; which presets ship in v1 (proposed: Shopify, WooCommerce, generic).

Validation: Phase 0 interviews skipped by the maintainer's decision. The ICP and adoption targets stay assumptions, tested by early-tester feedback in M6.

## 13. Definition of done

Tests pass, lint passes, dependency and static-analysis scans clean, docs updated, and the maintainer approved the change.
