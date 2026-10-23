# Contributing

Thanks for helping. This project has three promises every change must keep:

1. **Data never leaves the device.** No network requests, external scripts, fonts or analytics.
2. **Every number is explainable.** Scoring rules live in `packages/core` and are documented in `/docs/TRD.md` §8.
3. **Small, tested changes.** One slice at a time, tests first.

## Before you start

- Read `/docs/PRD.md` and the decision records in `/docs/adr/`.
- For anything beyond a small fix, open an issue first so we can agree on scope.

## Making a change

1. Branch from `main`; keep the branch short-lived.
2. Write a failing test, then the code that makes it pass.
3. Run `pnpm lint`, `pnpm typecheck` and `pnpm test`.
4. Open a pull request explaining what changed and why, with test evidence.

## Rules that block a merge

- New dependency without an ADR (see `/docs/adr/README.md`)
- Real customer data anywhere in the repository; use synthetic or anonymised fixtures
- Disabled or weakened tests
- Raw colour values instead of design tokens in UI code

## Reporting a bug

Open the in-app diagnostics panel, copy its report (it contains no customer data) and paste it into the issue, with the steps to reproduce.
