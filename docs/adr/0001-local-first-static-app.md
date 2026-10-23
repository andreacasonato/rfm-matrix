# ADR-0001: Local-first static app, no server

- Status: Accepted (approved by the maintainer as decision D1)
- Date: 2026-10-21

## Context

The app processes merchants' order exports, which contain personal data about their customers.
The project is free and maintained by one person with a $0 running budget. The playbook's
default stack is a server (FastAPI + PostgreSQL in Docker).

## Decision

The app is a static web app that runs entirely in the browser. Files are parsed, scored and
stored on the merchant's own device. There is no backend, no database server and no accounts.
Hosting is GitHub Pages.

## Consequences

- Positive: customer data never reaches the project; no hosting cost; no authentication or
  server attack surface; works offline after first load.
- Negative: file size is limited by browser memory (see ADR-0003); no scheduled refresh; no
  platform API connectors, because a browser cannot hold their secret keys safely (decision D4);
  no usage analytics, so feedback is voluntary.

## Governance

- Content-Security-Policy with `connect-src 'self'` and no third-party script or font hosts.
- A CI check fails if any built file references an external host.

## Notes

Connectors through an optional self-hosted server stay in `backlog.md`, not v1.
