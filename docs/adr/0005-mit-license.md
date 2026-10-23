# ADR-0005: MIT license

- Status: Accepted (approved as decision D3)
- Date: 2026-10-21

## Context

The project is free and open source. The main alternative was AGPL-3.0, which requires anyone
running a modified version as a network service to share their source code.

## Decision

The code is licensed under MIT. Bundled third-party assets keep their own licenses, for example
the Geist fonts under the SIL Open Font License 1.1.

## Consequences

- Maximum freedom for users and contributors, including commercial reuse.
- No protection against someone building a closed-source paid product on this code.

## Governance

- `LICENSE` at the repository root; the copyright holder name must be filled in before the
  first commit.
- Third-party license texts are shipped alongside their assets (e.g. `OFL.txt` next to font files).
- ADR-0006 lists the license of every dependency; new dependencies must be license-compatible.

## Notes

None.
