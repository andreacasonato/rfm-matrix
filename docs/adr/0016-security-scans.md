# ADR-0016: Dependency and static-analysis scans in CI

- Status: Accepted (approved by the maintainer on 2026-10-26)
- Date: 2026-10-26

## Context

BUILD_PLAN M4 and the PRD definition of done require dependency and static-analysis scans in
CI. ADR-0006 says dependency scanning runs in CI, but nothing ran it yet. A first `pnpm audit`
on 2026-10-26 found three advisories (one high, two moderate) in undici 8.11.2, which reaches
the repo only through jsdom, the DOM used by component tests. No app code or user ever runs it.

## Decision

- **Dependency scan:** `pnpm audit` runs in `ci.yml` before lint. It covers app and tooling
  packages and fails on any known advisory. It uses pnpm itself, so it adds no dependency.
- **Static analysis:** GitHub CodeQL in `.github/workflows/codeql.yml`, for
  `javascript-typescript` and `actions` (the workflow files), on pull requests, pushes to
  `main` and weekly. Free for public repositories.
- **undici fix:** a pnpm override to 8.12.2, the first patched version. It was published less
  than 14 days ago, so it is listed in `minimumReleaseAgeExclude`, the security-fix exception
  in ADR-0006. Remove both entries once jsdom requires a patched undici itself.

Checked on github.com and registry.npmjs.org on 2026-10-26:

| Item | Version | Commit or integrity | Published | License |
| --- | --- | --- | --- | --- |
| github/codeql-action (init, analyze) | v4.38.3 | 24c54180a607b1449ed407dd24f251e4e9147c8d | 2026-10-08 | MIT |
| undici (override) | 8.12.2 | sha512-XtuDWVdq… (lockfile) | 2026-10-15 | MIT |

Advisories fixed by the override: GHSA-xjj6-f33q-929c, GHSA-4qv8-2p9j-2685,
GHSA-f72v-6w45-q472.

## Consequences

- CI can turn red without a code change when a new advisory is published. That is intended:
  the fix is an upgrade through a new ADR, or a recorded exception.
- Only the CodeQL job gets `security-events: write`; every other job stays read-only.
- Results appear under the repository's Security tab.

## Governance

- Actions are pinned by commit SHA (ADR-0007). Version changes need a new ADR.
- Silencing an advisory (for example with `auditConfig.ignoreGhsas`) needs the maintainer's
  approval, recorded in an ADR with the reason.

## Notes

Optional repository settings for the maintainer, outside the code: Dependabot alerts, secret
scanning and push protection (Settings → Code security).
