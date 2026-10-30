# Releasing

How a version reaches the live app at https://andreacasonato.github.io/rfm-matrix/. Only the
maintainer releases (AGENTS.md: agents never push, tag or publish). Production deploys only from
a tagged release on `main` (TRD §13).

## Versions

Semantic versions (TRD §13), the same number in all three packages:

- `0.x.y` for early testers (M6). `1.0.0` is the public release.
- **Patch** (`0.1.1`): fixes only; a merchant's saved projects and project files still open.
- **Minor** (`0.2.0`): new features, or a change to what the app shows for the same file.
- A release that adds a migration (SCHEMA.md) is at least a minor version, and its changelog
  entry says so.

The version appears in the Diagnostics panel, so a bug report names the release it came from.

## Checklist

Copy this list into the release pull request and tick it off.

### 1. Before

- [ ] Everything for the release is merged into `main`, and CI is green on the last commit:
      audit, lint, type check, unit tests, build, the host and CSP checks, Playwright, and the
      100,000-row benchmark.
- [ ] No open issue labelled blocker.
- [ ] Locally, on a fresh clone of `main`:
      ```sh
      pnpm install --frozen-lockfile
      pnpm lint && pnpm typecheck && pnpm test
      pnpm test:e2e
      pnpm bench:ci
      ```

### 2. Prepare (one pull request to `main`)

- [ ] Set `"version"` in `packages/core`, `packages/io` and `packages/app` `package.json` to the
      new version.
- [ ] Move the `Unreleased` items in [CHANGELOG.md](../CHANGELOG.md) under a heading with the
      version and today's date. Write them for merchants: what they can do, not which file
      changed.
- [ ] Merge it once CI is green.

### 3. Tag

```sh
git switch main && git pull
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

On GitHub, create a release from the tag and paste the changelog entry into it. Mark `0.x`
releases as pre-releases.

### 4. Deploy

GitHub → Actions → **Deploy to GitHub Pages** → **Run workflow**, and under "Use workflow from"
choose the **tag**, not a branch. The first step refuses anything but a `vX.Y.Z` tag on `main`
([ADR-0009](adr/0009-pages-deploy.md)), and the workflow reruns every check before it publishes.

### 5. Check the live app

In a new private window (no earlier version, no saved data):

- [ ] Diagnostics shows the new version. To open it, upload an Excel (`.xlsx`) file and expand
      **Diagnostics** under the error.
- [ ] **Try sample data** reaches the grid.
- [ ] Open a segment and **Export** it: the toast names the file and the row count, and the file
      opens in a spreadsheet.
- [ ] The browser console shows no Content-Security-Policy errors.
- [ ] Offline: reload once, turn the network off in developer tools, reload again, and run the
      sample to the grid.

If any check fails, roll back (below), then open an issue.

## Rollback

Rollback means deploying the previous tag again (TRD §13): Actions → **Deploy to GitHub Pages**
→ **Run workflow** → choose the previous tag. Then delete the bad GitHub release, but keep its
tag, so the history stays honest.

Two things to know:

- **Returning users keep the old copy for a while.** The service worker (ADR-0020) serves the
  version a tab started with, and a new deploy takes over only once every tab of the old version
  is closed. That holds for a rollback too. Ask testers to close every tab of the app and open
  it again.
- **Data saved by a newer version.** If the bad release added a migration, the previous version
  may not open what it saved. Tell testers to **Save project file** before you roll back, and
  never roll back across a migration without a plan in the issue.

## After the release

- Post the release link to the early testers (see [early-testers/](early-testers/README.md)),
  with what changed in one or two lines.
- Add a new empty `Unreleased` section to the changelog.
