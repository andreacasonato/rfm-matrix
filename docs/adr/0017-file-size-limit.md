# ADR-0017: A 320 MB file size limit, and out-of-memory errors

- Status: Accepted (approved by the maintainer on 2026-10-26)
- Date: 2026-10-26

## Context

PRD §12 promises "a clear size limit", and TRD §11 says a file too big for memory should be
named as such, with the rows reached, instead of a generic error. The M1 benchmark proved a
304 MB synthetic file of 1,000,000 rows (302,807 customers) at a peak of 968 MB of memory,
under the 1,200 MB limit.

## Decision

- `io` refuses a file over 320,000,000 bytes (`maxFileBytes`) from its size alone, before any
  byte is read, with "This file is larger than 320 MB" and the advice to export a shorter date
  range.
- In the worker, the `RangeError`s V8 throws when an allocation is refused ("Array buffer
  allocation failed", "Invalid string/array/typed array length") are reported as
  `out-of-memory`. Upload and Processing then say "This file is too large for your browser",
  how many rows were read, and what to do.

## Consequences

- Memory depends on the number of customers and orders more than on bytes, so the limit is
  conservative for wide exports such as Shopify's (more bytes per row, fewer rows).
- When the browser kills the whole tab instead of throwing, nothing can be shown; the limit is
  what keeps that rare.
- Raising the limit needs a new benchmark at the new size and a new ADR.

## Governance

- `preview.test.ts` pins the limit and proves a larger file is refused without being read.
- Component tests cover both messages on Upload and Processing.

## Notes

None.
