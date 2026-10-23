# ADR-0007: Development tooling: linter, type packages and CI actions

- Status: Accepted (approved by the maintainer on 2026-10-23)
- Date: 2026-10-23

## Context

M0 needs `pnpm lint`, `pnpm typecheck` and a CI workflow. ADR-0006 pins the runtime and test
libraries but no linter, no type packages and no CI actions. ADR-0006 pins TypeScript 7.0.2;
typescript-eslint 8.71.1 (the newest eligible release) declares `typescript >=4.8.4 <6.1.0`,
so ESLint cannot lint this codebase with type information.

## Decision

Checked on registry.npmjs.org and github.com on 2026-10-23. Same 14-day rule as ADR-0006:
newest stable version published on or before 2026-10-09.

| Package | Purpose | Pinned | Published | License |
| --- | --- | --- | --- | --- |
| @biomejs/biome | Linter and formatter; does not depend on the TypeScript compiler | 2.5.15 | 2026-09-30 | MIT OR Apache-2.0 |
| @types/react | React type definitions (React 19 ships none) | 19.3.0 | 2026-09-09 | MIT |
| @types/react-dom | React DOM type definitions | 19.3.0 | 2026-09-09 | MIT |
| @types/node | Types for Node-run checks and tests; matches Node 24 | 24.19.1 | 2026-10-01 | MIT |

GitHub Actions, pinned by commit SHA:

| Action | Tag | Commit | Published | License |
| --- | --- | --- | --- | --- |
| actions/checkout | v7.0.1 | 3d3c42e5aac5ba805825da76410c181273ba90b1 | 2026-07-20 | MIT |
| actions/setup-node | v7.1.0 | 949feb2413d6458794dcd2491c4babbbce0c15c1 | 2026-10-08 | MIT |
| pnpm/action-setup | v6.1.0 | ea17c68df8912ef543352723c149a84f56e3d413 | 2026-09-05 | MIT |

Node.js 24 (LTS) is the development and CI runtime.

`@vitejs/plugin-react` is not adopted: Vite compiles JSX without it; the only loss is React
fast refresh during development.

## Consequences

- One linter binary with no plugin tree; lint rules cannot use type information.
- Project-specific rules (import boundaries, external hosts, raw colours) are written as
  tests in `tools/checks`, not as linter plugins.

## Governance

- Exact versions in `package.json`; actions referenced by full commit SHA, never by tag.
- Version changes follow ADR-0006: a new ADR, approved by the maintainer.

## Notes

None.
