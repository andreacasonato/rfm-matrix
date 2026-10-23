# ADR-0009: Manually triggered GitHub Pages deploy

- Status: Accepted (deploy workflow approved by the maintainer on 2026-10-23 for M1)
- Date: 2026-10-23

## Context

BUILD_PLAN M1 asks for the prototype on GitHub Pages (ADR-0001). Agents may not push or
publish, and TRD §13 deploys production only from a tagged release on `main` after the
maintainer's approval. Pages deploys need three GitHub-maintained actions not covered by
ADR-0007.

## Decision

A workflow, `.github/workflows/deploy-pages.yml`, that only runs when the maintainer starts it
from the GitHub Actions tab. It reruns lint, type check, tests, build and the external-host
check, then publishes `packages/app/dist`.

Checked on github.com on 2026-10-23, newest release on or before 2026-10-09, pinned by SHA:

| Action | Tag | Commit | Published | License |
| --- | --- | --- | --- | --- |
| actions/configure-pages | v6.0.0 | 45bfe0192ca1faeb007ade9deae92b16b8254a0d | 2026-03-25 | MIT |
| actions/upload-pages-artifact | v5.0.0 | fc324d3547104276b827a68afc52ff2a11cc49c9 | 2026-04-10 | MIT |
| actions/deploy-pages | v5.0.1 | 368f82528645a54fb793d4d04e342629a3f51346 | 2026-09-01 | MIT |

## Consequences

- Nothing is published without a person pressing "Run workflow".
- Until M4 there is no Content-Security-Policy, so the prototype relies on the build check
  alone for its no-network promise.
- Before v1, the trigger should be limited to release tags on `main` (TRD §13); that change
  needs the maintainer's approval as a hosting change.

## Governance

- Only the deploy job gets `pages: write` and `id-token: write`; the build job reads only.
- Changing the trigger or the published folder is a hosting change and needs approval.

## Notes

One-time setup by the maintainer: repository Settings → Pages → Source: "GitHub Actions".
