# ADR-0009: Manually triggered GitHub Pages deploy

- Status: Accepted (deploy workflow approved by the maintainer on 2026-10-23 for M1; deploys
  limited to release tags on `main`, approved for M6 R3)
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
- Since M6, a deploy runs only from a release tag on `main` (TRD §13); see Amendment below.

## Governance

- Only the deploy job gets `pages: write` and `id-token: write`; the build job reads only.
- Changing the trigger or the published folder is a hosting change and needs approval.

## Amendment (M6 R3, 2026-10-30): deploy only from release tags on `main`

The workflow still starts only by hand. Its first step after checkout,
`node tools/checks/check-release-ref.ts`, fails the run unless:

- it was started from a tag, not a branch (`GITHUB_REF_TYPE` is `tag`);
- the tag is a release version, `v` and three numbers such as `v0.1.0`, with no suffix;
- the tag's commit is on `main` (`git merge-base --is-ancestor HEAD origin/main`, after a
  checkout with full history).

The rules live in `tools/checks/release-ref.ts`, with unit tests. Rollback is unchanged: start
the workflow from the previous tag, which passes the same check.

The ref names reach the script as environment variables, never pasted into a shell command, so a
hostile branch or tag name cannot run code in the workflow.

**Limit.** The check lives in the workflow file, so a collaborator with push access could edit
the file on a branch and start it from there. GitHub can enforce the rule outside the file:
Settings → Environments → `github-pages` → Deployment branches and tags → "Selected branches and
tags" → add the tag rule `v*`. It is a repository setting, not something this repository's
code can change.

**In place since 2026-10-30.** The first tag deploy (v0.1.0) was refused because the
environment allowed only `main`, GitHub's default. The maintainer added the tag rule `v*` and
removed `main`, so GitHub now refuses any deploy that is not from a tag, whatever the workflow
file says.

## Amendment (2026-10-30): deploy when a release tag is pushed

Approved by the maintainer after v0.1.0. Pushing a tag matching `v*.*.*` now starts the
workflow, so a release no longer needs a click in Actions; starting it by hand stays, for
rollback. A person still decides when the live app changes, because only the maintainer pushes
tags. Everything else holds: the release-ref check (a stricter `vX.Y.Z` than the trigger's
pattern, on `main`), the `v*` tag rule on the environment, and every check before publishing.
Pushes to branches, `main` included, never deploy (TRD §13).

## Notes

One-time setup by the maintainer: repository Settings → Pages → Source: "GitHub Actions".
