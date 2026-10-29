# ADR-0003: Parse and score in a Web Worker

- Status: Accepted; confirmed by the M1 benchmark on 2026-10-23
- Date: 2026-10-21

## Context

The TRD targets 1,000,000 order rows scored in under 60 s (p95) on a mid-range laptop, with the
page never frozen for more than 100 ms. The playbook's default is synchronous work, with
background work when a task takes longer than about 10 s. A 1M-row file is estimated at about
300 MB raw (an assumption: 300 bytes per row).

## Decision

- Parsing and scoring run in a dedicated Web Worker.
- Files are streamed row by row and reduced to one aggregate per customer as they are read;
  the whole file is never held in memory.
- The worker reports progress every 250 ms or 50,000 rows; the UI offers Cancel.

## Consequences

- The UI stays responsive on large files.
- Worker messaging adds code; errors must cross the worker boundary with useful messages.

## Governance

- M1 is done only when a synthetic 1,000,000-row CSV meets the target on the reference laptop.
  Record the laptop, browser and measured p50/p95 in the Notes section below.
- A 100,000-row benchmark runs in CI and fails the build if it exceeds the TRD p95 target.

## Notes

M1 results, 2026-10-23 (`pnpm bench:generate --rows 1000000 --seed 1`, then `pnpm bench:run`):

| Item | Value |
| --- | --- |
| Reference laptop | Apple M1, 8 cores, 8 GB RAM (maintainer's machine, approved in ADR-0008) |
| Browser | Chromium 156.0.8078.4, headless, driven by Playwright 1.64.0 |
| File | Synthetic Shopify-style CSV, 1,000,000 rows, 290 MB, 302,807 customers, 604,692 orders |
| Measured | File picked → per-customer totals ready, 20 runs |
| p50 / p95 | 4.6 s / 6.8 s (target 30 s / 60 s) |
| Longest main-thread task | None over 50 ms, the Long Tasks API threshold (target 100 ms) |
| Peak memory, all browser processes | 750 MB |
| Correctness | Every run matched the generator's row, customer, order and revenue totals |
| Cancel | Stops the worker; no result arrives afterwards |

An earlier identical session measured 4.5 s / 5.5 s; the spread comes from the laptop, not
the file.

Limits of this result:

- Parsing and aggregation only. Scoring and segmenting about 300,000 customers is added in
  M2/S4 and is not yet measured. (Measured in M2; see below.)
- Chromium only. Firefox and Safari are not measured; the 100k-row CI benchmark (M5) should
  cover more than one engine.
- Memory grows with customers and orders, not rows, because each customer keeps its order IDs
  until the end. 750 MB is acceptable on an 8 GB laptop, but it is the first limit to watch.

M2 update, 2026-10-24: same file, laptop and browser, now timed from file picked to segment
counts ready (parse, aggregate, score with ADR-0010 percentiles, apply the default map,
summarise). 20 runs: p50 4.4 s, p95 5.5 s; no main-thread task over 50 ms; peak memory of all
browser processes 796 MB; segment counts added up to the customer count in every run. Scoring
adds no measurable time next to parsing.

M6 update, 2026-10-29: the CI benchmark failed with "main thread blocked 144 ms" although
nothing had changed in scoring, and the app before that push (abae1b9) measured the same.
Every long task came at the moment the file is picked, before Run analysis: one rendering frame
of 55–175 ms that ran almost no script, style or layout, so headless Chromium was waiting rather
than working. It appears mostly on the first upload in a fresh browser and is longer on slower
machines. The benchmark had counted the whole session, which is stricter than TRD §3 ("UI frame
during scoring"). With the maintainer's approval it now fails only on tasks between Run analysis
and segment counts ready, and still reports the whole session's longest task
(`longestSessionBlockMs`). If a merchant reports the upload freezing, start there.
