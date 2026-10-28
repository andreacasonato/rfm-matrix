# ADR-0020: Offline after first load, with a hand-written service worker

- Status: Accepted (approved by the maintainer on 2026-10-28)
- Date: 2026-10-28

## Context

TRD §2, PRD §7 and ADR-0001 promise that the app works offline after the first load. A static
page does not: closing the tab with no network leaves nothing to open. A service worker is the
only browser feature that can serve the app's files without a network. Libraries such as
Workbox or vite-plugin-pwa would add dependencies (AGENTS.md) for about 30 lines of code.

## Decision

- **No new dependency.** `packages/app/src/offline/service-worker.ts` holds the worker as one
  self-contained function. After each build, a small plugin in `vite.config.ts` lists every file
  in `dist` (the sample and the font licence included) and writes `sw.js`: that function, the
  list, and a store name hashed from every file's name and content.
- **Install:** stores every file, fetched with `cache: 'reload'` so the browser's own cache
  cannot hand it the previous version's page.
- **Requests:** only GET requests to the app's own origin. A stored copy answers first, matched
  with `ignoreVary` (servers may send `Vary: Origin`, and module scripts send an Origin header);
  anything else goes to the network as before. Any page request in the app's folder gets the
  app's page.
- **Updates:** no `skipWaiting`. A new version takes over once every tab of the old one is
  closed, then deletes older `rfm-matrix-` stores. An open tab never loses the hashed files it
  started with, such as the analysis worker it loads later.
- `main.tsx` registers `./sw.js` in production builds only. A refusal (a private window, for
  example) is ignored: the app still works online.

## Consequences

- The Content-Security-Policy is unchanged: `worker-src 'self'` already allows it, and the
  Trusted Types default policy (ADR-0015) already accepts script URLs in the app's folder. Its
  comment now names this second sink.
- The service worker's scope is the app's folder, so it never sees the owner's other Pages sites
  on the same origin (ADR-0015).
- After a deploy, a returning user sees the old version until they close every tab of it.
- About 1.2 MB is stored on the device for the app's files (half of it the sample), beside
  IndexedDB. Delete all data does not remove it: it holds no customer data.
- Uploaded files are read with the File API and never fetched, so they never reach the store.

## Governance

- Unit tests cover install, clean-up, cache answers, the network fallback, other hosts and
  methods, and the generated `sw.js`.
- `e2e/offline.spec.ts` loads the app once, goes offline, reloads and runs the sample to a grid.
- `pnpm check:hosts` scans `sw.js` with the rest of the build.

## Notes

If the maintainer wants new versions to take over at once, add an "Update ready, reload" notice
that calls `skipWaiting` on request; that is in `backlog.md`, not built.
