# ADR-0004: Quantile scores with value-based ties; fixed breaks for frequency

- Status: Accepted (approved with the TRD)
- Date: 2026-10-21

## Context

RFM tools score each dimension 1–5, either by fixed thresholds or by quantiles. Quantiles adapt
to each store's data. Frequency is a small whole number, often dominated by one-time buyers,
which makes quantile bins collapse; users of published RFM guides have asked how ties should
be handled.

## Decision

1. Rows are grouped by order ID first; a multi-line order counts once.
2. Recency = whole days from the analysis date to the latest order. Default analysis date: the
   day after the latest order in the file.
3. Frequency = distinct orders in the lookback window. Monetary = total amount, gross or net,
   refunds optionally subtracted.
4. Recency and monetary scores use quantile breakpoints: score = 1 + the number of the 20th,
   40th, 60th and 80th percentile values strictly below the customer's value. Recency is
   reversed so the most recent customers score 5.
5. Equal values always get equal scores, so bins can be uneven; the UI shows bin sizes.
6. Frequency defaults to fixed breaks: 1, 2, 3, 4–5, 6+ orders. Users can switch to quantiles.
7. Fixed thresholds are available for all three dimensions.

## Consequences

- Scores are reproducible and explainable; ties never split customers with identical behaviour.
- Bin sizes are not always 20% each, which must be explained in "How scores work".

## Governance

- Golden-fixture tests, including a hand-checked published 15-customer example.
- Property tests: every score is 1–5; equal inputs give equal scores; every customer gets
  exactly one segment.
- Any change to these rules needs a new ADR.

## Notes

The default segment map that consumes these scores is defined in `/docs/SCHEMA.md`.
