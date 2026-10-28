# ADR-0018: Test tools for storage and accessibility

- Status: Accepted (approved by the maintainer on 2026-10-26)
- Date: 2026-10-26

## Context

M5 adds local persistence (S8, migration 001) and WCAG AA checks (H3). Storage code and every
migration need tests that run without a browser, and accessibility needs checks on rendered
screens in both themes. `idb` itself is already pinned by ADR-0006 and is installed now.

## Decision

Checked on registry.npmjs.org on 2026-10-26, newest stable version published on or before
2026-10-12 (14-day rule from ADR-0006). Both are development-only and never reach the build.

| Package | Purpose | Pinned | Published | License |
| --- | --- | --- | --- | --- |
| fake-indexeddb | IndexedDB in Node, for storage and migration tests | 6.2.5 | 2025-11-07 | Apache-2.0 |
| @axe-core/playwright | Runs axe accessibility checks in the e2e tests | 4.13.0 | 2026-08-11 | MPL-2.0 |
| axe-core | Pulled in by the above (`~4.13.0`) | 4.13.x | — | MPL-2.0 |

`fake-indexeddb` has no dependencies. MPL-2.0 is file-level copyleft: it applies to changes to
axe's own files, which we never ship or modify, so it does not affect the MIT app.

## Consequences

- Storage tests run in Vitest; the e2e tests still prove storage in a real browser.
- `@axe-core/playwright` is installed with H3, when the first check uses it.

## Governance

- Exact versions, lockfile committed; changes through a new ADR (ADR-0006).

## Notes

None.
