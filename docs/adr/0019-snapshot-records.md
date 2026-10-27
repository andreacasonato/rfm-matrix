# ADR-0019: How a snapshot is saved: file fingerprint, extra fields, one transaction

- Status: Accepted (approved by the maintainer on 2026-10-27)
- Date: 2026-10-26

## Context

SCHEMA.md lists the key fields of each store and says `sourceFileHash` is the file's SHA-256,
used to warn when the same file is imported twice. Browsers' Web Crypto cannot hash a stream:
a SHA-256 of a whole 300 MB file would hold all of it in memory, which ADR-0017 exists to avoid.
A saved snapshot must also reopen without the file, so it needs the totals the grid shows.

## Decision

- **Fingerprint:** `sourceFileHash` is the SHA-256 of the file's size, its first 4 MB and its
  last 4 MB (`storage/fingerprint.ts`). It reads at most 8 MB and still tells two exports
  apart unless they share size, start and end.
- **Extra fields, no new stores or indexes:** a project's `columnMapping` holds the column
  numbers with the read settings and amount level that decide how a file is read; a snapshot
  adds `report` (orders, revenue, repeat customers, cleaning counts). `rowCounts.excluded` is
  rows that could not be used; order-level exclusions are in `report.cleaning`.
- **One transaction** writes the project, its rules, the snapshot and every customer record,
  so a full disk or a crash saves nothing rather than a partial snapshot. Customer records go in
  batches of 5,000 within it, each awaited before the next, so the queue of pending writes
  stays small: with all 270,814 queued at once the 1M-row benchmark peaked at 1,204 MB, over its
  1,200 MB limit; batched, 1,107 MB, and the save took 7.4 s (p50) instead of 9.4 s.
- **The worker saves,** since it already holds the customer table; 270,000 records never pass
  through the page. The page decides when: the sample is never saved.

## Consequences

- Two different files with the same size, first and last 4 MB would look identical. An edited
  export of the same orders changes its end, so in practice it still warns correctly.
- Migration 001 is unchanged: IndexedDB records may carry fields beyond the indexed ones.

## Governance

- `save-snapshot.test.ts` checks every stored field, and that names, addresses, phone numbers
  and raw order rows never reach storage.

## Notes

None.
