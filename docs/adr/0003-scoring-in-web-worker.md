# ADR-0003: Parse and score in a Web Worker

- Status: Accepted, to be confirmed or revised by the M1 benchmark
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

M1 results: _to be filled in_.
