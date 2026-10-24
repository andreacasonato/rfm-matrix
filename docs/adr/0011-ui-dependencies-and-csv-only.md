# ADR-0011: UI dependencies, CSV-only import for now, no router

- Status: Accepted (approved by the maintainer on 2026-10-24)
- Date: 2026-10-24

## Context

M3 builds the real screens. Tailwind CSS 4 needs a Vite plugin that ADR-0006 does not list,
DESIGN.md requires Lucide icons, and every component must show hover, focus, disabled,
loading, empty and error states, which needs component tests. ADR-0006 also left XLSX parsing
open, to be resolved before slice S1.

## Decision

Checked on registry.npmjs.org on 2026-10-24, newest stable version published on or before
2026-10-10 (14-day rule from ADR-0006):

| Package | Purpose | Pinned | Published | License |
| --- | --- | --- | --- | --- |
| @tailwindcss/vite | Tailwind CSS 4 build plugin for Vite | 4.3.3 | 2026-07-16 | MIT |
| lucide-react | Icons that label actions (DESIGN.md) | 1.54.0 | 2026-10-09 | ISC |
| @testing-library/react | Component tests | 16.3.3 | 2026-08-27 | MIT |
| @testing-library/dom | Peer of the above | 10.4.2 | 2026-09-13 | MIT |
| jsdom | DOM for component tests in Vitest | 30.1.2 | 2026-10-04 | MIT |

Testing packages are development-only and never reach the build.

**XLSX (resolves the open item in ADR-0006):** v1 imports CSV only for now. An XLSX file is
recognised by its signature and the user is told how to save it as CSV. SheetJS is not
distributed through npm, so the registry age check and dependency scanning would not cover
it. Revisit before v1.0.

**Navigation:** screens switch through a small state machine in React. No router library: no
screen needs a shareable URL, and the app has a single page.

## Consequences

- PRD story 1 is met for CSV only until XLSX is revisited; the PRD scope already marks XLSX
  as pending.
- Browser back and forward buttons do not move between screens.

## Governance

- Exact versions, lockfile committed, changes through a new ADR (ADR-0006).

## Notes

None.
