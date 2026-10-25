# ADR-0013: Cleaning rules, refunds, net amounts and the analysis window

- Status: Accepted (approved by the maintainer on 2026-10-25)
- Date: 2026-10-25

## Context

PRD story 3 lets store owners exclude cancelled, refunded and test orders and choose gross or
net amounts. TRD §8 rules 3 and 4 limit F and M to a lookback window and allow refunds to be
subtracted, without saying how refunds appear in a file or what happens to orders after the
analysis date. Exports put an order's status, and sometimes its date, on its first row only.

## Decision

1. **Whole orders, not rows.** Rows are grouped into orders (per customer and order ID) first;
   an order's status is its first non-empty status and its date its first date. Every rule
   below includes or excludes whole orders, applied once the file has been read, so the order
   of rows in the file does not matter.
2. **Statuses.** Orders whose status looks cancelled, voided, failed, declined, pending, draft,
   test or trashed, or is exactly "refunded" (fully refunded), are excluded by default. The
   user can change every choice; each status shows its order count.
3. **Refunds.** An optional "Refunded amount" column, when mapped and "Subtract refunds" is on
   (default), is subtracted from its order. An order whose amount is negative (a refund
   written as its own row) reduces M but does not count as an order for F or recency. A
   customer's M may be negative; it then scores lowest.
4. **Net amounts** are the amount minus the optional mapped Tax and Shipping columns; without
   either column, net cannot be chosen.
5. **Analysis date and window.** The default analysis date is the UTC day after the latest
   order (ADR-0010). Orders dated after the analysis date are excluded, so recency is never
   negative. With a lookback of N days, orders more than N days before the analysis date are
   excluded. Customers left with no order are not scored and are counted.
6. Optional value columns (refunded, tax, shipping) follow the file's amount rule from
   ADR-0012 (first non-empty value per order, or added up per product line).

## Consequences

- The app keeps one small record per order while reading (not per row), so memory grows with
  orders. Raw rows are still never stored (SCHEMA.md).
- A summary pass reads the file once more after mapping, so the cleaning screen can show
  exact counts before the analysis runs.

## Governance

- A hand-counted fixture checks every exclusion count; property tests check that used plus
  excluded orders equal all orders.
- Changing these rules needs a new ADR.

## Notes

None.
