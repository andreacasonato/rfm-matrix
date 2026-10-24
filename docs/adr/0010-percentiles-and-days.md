# ADR-0010: Percentile method and day counting for scores

- Status: Accepted (approved by the maintainer on 2026-10-24)
- Date: 2026-10-24

## Context

ADR-0004 and TRD §8 score R and M against the 20th, 40th, 60th and 80th percentiles, and count
recency in whole days from the analysis date. They do not say how a percentile is computed
from a finite list, or in which time zone a day starts. Both change scores on real data.

## Decision

1. **Percentiles** use linear interpolation between closest ranks, the method of Excel's and
   LibreOffice's `PERCENTILE.INC` (also R type 7 and NumPy's default). For sorted values
   x₀ … xₙ₋₁ and fraction p: h = (n − 1)·p; result = x⌊h⌋ + (h − ⌊h⌋)·(x⌈h⌉ − x⌊h⌋).
   A merchant can reproduce every breakpoint in their own spreadsheet.
2. **Days** are calendar days in UTC. The default analysis date is the UTC day after the
   latest order in the file. Recency = analysis date − the UTC date of the customer's latest
   order, in days, so a customer who ordered on the latest day has recency 1.
3. Recency is reversed by R = 6 − score(recency days), which keeps equal values equal.

## Consequences

- Breakpoints can fall between two customers' values; ties are still never split (ADR-0004).
- Orders placed late in the evening in time zones far from UTC can land on the next day. A
  store time-zone setting arrives with cleaning and settings (S3).

## Governance

- Unit tests compare breakpoints with `PERCENTILE.INC` values computed by hand.
- The Putler golden fixture (S4) checks this choice against a published example; a mismatch
  is brought to the maintainer, not patched over.
- Any change needs a new ADR.

## Notes

The maintainer also confirmed on 2026-10-24 that loading the app's own static files from its
own origin (the worker script, the sample CSV) is not a "network request" in the sense of
AGENTS.md and ADR-0001: nothing leaves the device and CSP `connect-src 'self'` allows it.
