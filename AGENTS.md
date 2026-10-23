# AGENTS.md: rules for AI coding agents

Read this file at the start of every session. If a request conflicts with it, stop and ask.

## What this project is

RFM Matrix: a free, open-source (MIT) web app that turns an e-commerce order export
(CSV or XLSX) into an RFM segment grid. It runs entirely in the browser. There is no
server, no account and no network request after the page loads.

## Read before any change

- `/docs/PRD.md`, `/docs/TRD.md`, `/docs/APP_FLOW.md`, `/docs/DESIGN_BRIEF.md`,
  `/docs/SCHEMA.md`, `/docs/BUILD_PLAN.md`
- Every decision record in `/docs/adr/`
- `DESIGN.md` before any UI work

## Stack and layout

- TypeScript, React, Vite, Tailwind CSS, pnpm workspaces. Versions are pinned in
  ADR-0006; do not change them without a new ADR.
- Packages:
  - `packages/core`: scoring rules, segment map, movement. Pure functions. Imports
    nothing from `io`, `app`, React, the DOM or browser storage.
  - `packages/io`: streaming CSV/XLSX parsing and safe CSV export. May import `core`.
  - `packages/app`: React UI, Web Worker orchestration, IndexedDB persistence.
    May import `core` and `io`.
- Scoring and parsing run in a Web Worker, never on the main thread.

## Never

- Add a network request, external script, external font, analytics or telemetry.
- Store raw order rows anywhere. Only per-customer aggregates are persisted.
- Store names, addresses or phone numbers, even if the uploaded file contains them.
- Add or upgrade a dependency without a new or updated ADR approved by the maintainer.
- Disable, skip or weaken a test, or edit a test to make failing code pass.
- Edit a migration file that has been released.
- Use raw hex colours or default Tailwind palette classes in UI code.
- Use real merchant data in code, tests, fixtures or chat. Use synthetic or anonymised data.
- Push to `main`, publish a release, or change the Content-Security-Policy.

## Always

- Write the tests first, then the code, one step at a time.
- Run `pnpm lint`, `pnpm typecheck` and `pnpm test` and show the output before saying
  a task is done.
- Keep files under about 200 lines; split before they grow past that.
- Add a regression test with every bug fix.
- Escape exported CSV cells that start with `=`, `+`, `-` or `@`.
- Put new ideas in `backlog.md` instead of building them.
- Use the same verbs as `/docs/APP_FLOW.md`: Export, Delete, Run analysis, Save project.

## Needs the maintainer's approval first

- A new dependency or a version change
- A new migration
- Any change to the scoring rules (TRD §8) or the default segment map (SCHEMA.md)
- Any change to the Content-Security-Policy or build output hosting

## The loop for every slice

1. Write a short spec: scope, out of scope, steps, files to change, a 5–20 line test recipe.
2. Wait for approval.
3. Write tests, then code, one step at a time.
4. Run the checks and show the results.
5. List every changed file, including deletions.
6. Answer: how could someone break this, for example with a hostile file?
7. Remove debug output, dead code and temporary files.
8. Commit locally on the current branch with a message that explains why, once all checks pass. Committing to `main` is allowed; never push.
