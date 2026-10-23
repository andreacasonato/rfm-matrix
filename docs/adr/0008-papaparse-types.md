# ADR-0008: Type definitions for Papa Parse

- Status: Accepted (approved by the maintainer on 2026-10-23)
- Date: 2026-10-23

## Context

ADR-0006 adopts Papa Parse 5.7.0 for streaming CSV parsing. The package ships no TypeScript
declarations, so `io` cannot be type-checked against its API without them.

## Decision

Checked on registry.npmjs.org on 2026-10-23, same 14-day rule as ADR-0006.

| Package | Purpose | Pinned | Published | License |
| --- | --- | --- | --- | --- |
| @types/papaparse | Type definitions for Papa Parse | 5.5.2 | 2025-12-13 | MIT |

## Consequences

- The definitions target the 5.5 API. Options added in 5.6 or 5.7 are not typed; `io` uses
  only options present in both.
- A dev-only dependency: nothing from it reaches the build.

## Governance

Same as ADR-0006: exact version, lockfile committed, changes through a new ADR.

## Notes

The maintainer also approved, for M1: this Mac (Apple M1, 8 GB RAM, 8 cores) as the TRD's
reference laptop, and a manually triggered GitHub Pages deploy workflow for the prototype.
