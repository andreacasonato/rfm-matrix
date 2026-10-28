# ADR-0015: Content-Security-Policy as a meta tag, with Trusted Types

- Status: Accepted (approved by the maintainer on 2026-10-26, including the `trusted-types default` change below)
- Date: 2026-10-26

## Context

ADR-0001 and TRD §10 rest the no-network promise on a strict Content-Security-Policy, and
ADR-0009 shipped the prototype without one until M4. GitHub Pages cannot send custom HTTP
headers, so the policy has to be in the page.

## Decision

`packages/app/csp.ts` holds the policy. A small plugin in `vite.config.ts` adds it to the
production build as the first tag in `<head>`; the dev server does not get it, because Vite's
dev mode injects inline styles and a live-reload socket.

```
default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self';
connect-src 'self'; worker-src 'self'; manifest-src 'self'; base-uri 'none';
form-action 'none'; object-src 'none';
require-trusted-types-for 'script'; trusted-types default
```

- No `unsafe-inline`, `unsafe-eval`, `data:`, `blob:` or other hosts. React's `style` props
  are set through the CSSOM, which `style-src 'self'` allows. Exports download from a `blob:`
  link, which no directive governs.
- **Trusted Types** make the browser refuse strings written into HTML, script and script-URL
  sinks, so text from an uploaded file can never become markup or code. The approved draft
  said `trusted-types 'none'`, but Chromium treats `new Worker(url)` as a script-URL sink, and
  the analysis worker could not start. The fix is one `default` policy
  (`src/trusted-types.ts`) that only creates script URLs inside the app's own folder, and
  defines no HTML or script rule, so those sinks stay blocked. A named policy would need the
  worker call wrapped, which stops Vite from bundling the worker.

## Consequences

- A meta policy cannot cover what a header would:
  - **The worker has no policy.** A worker takes its policy from its own script's response
    headers, and Pages sends none. The build check for external hosts (TRD §10) still guards
    the worker code.
  - **No `frame-ancestors`**, so another site can frame the app. No action in the app acts on
    another site's behalf, and Delete all data will ask the user to type DELETE.
  - **`'self'` is the whole `<user>.github.io` origin**, shared with the owner's other Pages
    sites. The Trusted Types policy is narrower: it accepts the app's own folder only.
- Firefox and older browsers without Trusted Types still get every other directive.

## Governance

- `pnpm check:csp` (CI and the deploy workflow) fails unless the built page has exactly this
  policy, once, before every script, stylesheet and style.
- `e2e/csp.spec.ts` runs the sample and upload paths with zero violations, and proves that a
  request to another host, injected HTML and an injected inline script are all blocked.
- Changing the policy needs the maintainer's approval (AGENTS.md) and a new ADR.

## Notes

If hosting moves to a host that can send headers, send the same policy as a header and add
`frame-ancestors 'none'`; that is a hosting change and needs approval.
