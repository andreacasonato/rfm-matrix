# ADR-0006: Libraries, pinned versions and licenses

- Status: Accepted, except the XLSX parser (open)
- Date: 2026-10-21

## Context

The playbook requires every package to be checked on the official registry for existence,
maintenance and license before install, and versions to be pinned exactly. As a supply-chain
precaution, this project only pins versions published at least 14 days before adoption.

## Decision

Checked on registry.npmjs.org on 2026-10-21. "Pinned" is the newest stable version published
on or before 2026-10-07.

| Package | Purpose | Pinned | Published | License |
| --- | --- | --- | --- | --- |
| typescript | Language | 7.0.2 | 2026-07-08 | Apache-2.0 |
| react | UI | 19.3.0 | 2026-09-09 | MIT |
| react-dom | UI | 19.3.0 | 2026-09-09 | MIT |
| vite | Build and dev server | 8.3.3 | 2026-10-06 | MIT |
| tailwindcss | Styling with a replaced palette | 4.3.3 | 2026-07-16 | MIT |
| papaparse | Streaming CSV parsing | 5.7.0 | 2026-08-24 | MIT |
| idb | Small IndexedDB wrapper | 8.0.4 | 2026-10-06 | ISC |
| geist | Geist and Geist Mono font files | 1.7.2 | 2026-06-01 | SIL OFL 1.1 |
| vitest | Unit tests | 5.0.3 | 2026-09-30 | MIT |
| fast-check | Property tests | 4.10.2 | 2026-09-19 | MIT |
| @playwright/test | End-to-end tests | 1.64.0 | 2026-10-07 | Apache-2.0 |
| pnpm | Package manager and workspaces | 12.10.1 | 2026-10-06 | MIT |

All licenses above permit use in an MIT project.

## Open: XLSX parsing

The npm package `xlsx` (SheetJS) was last published on npm as 0.18.5 on 2022-03-24. Newer
SheetJS releases are distributed from SheetJS's own site, which could not be checked for this
ADR. Before slice S1, choose one:

1. Install SheetJS from its official distribution after verifying the version and license.
2. Ship v1 with CSV only and ask users to save XLSX files as CSV.

Until decided, XLSX support is out of scope for M2.

## Consequences

- Upgrades are deliberate: a version change updates this table in a new ADR.
- The 14-day rule delays security patches; a published security fix may be adopted sooner with
  the maintainer's approval, recorded here.

## Governance

- `package.json` files use exact versions (no `^` or `~`); the lockfile is committed.
- Dependency scanning (SCA) runs in CI.
- Geist font files are copied from the `geist` package with their `OFL.txt`; no font is loaded
  from Google Fonts or any other host (ADR-0001).

## Notes

Font source: Vercel's own files, because the Google Fonts copy lacks the full glyph set and
font-feature-settings support needed for tabular figures (https://vercel.com/font).
