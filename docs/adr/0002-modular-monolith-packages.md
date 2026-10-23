# ADR-0002: Modular monolith with `core`, `io` and `app` packages

- Status: Accepted (approved as decision D2)
- Date: 2026-10-21

## Context

The scoring rules are the heart of the product and must be testable without a browser and
reusable later as a library or command-line tool. The playbook recommends a modular monolith
with dependencies pointing inward toward business rules.

## Decision

One repository, one deployable app, three pnpm workspace packages:

- `core`: entities and rules (aggregation, scoring, segment map, movement). No I/O.
- `io`: file parsing and export. Depends on `core`.
- `app`: React UI, Web Worker, IndexedDB. Depends on `core` and `io`.

## Consequences

- `core` can be unit-tested in Node and published to npm later.
- Slightly more setup than a single package.

## Governance

- A fitness test in CI fails if `core` imports from `io`, `app`, React, the DOM or IndexedDB.
- A fitness test fails if `io` imports from `app`.

## Notes

Split by workflow, not by database table (the playbook's "entity trap").
