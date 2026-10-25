# ADR-0012: Column mapping: order amounts, dates, customer keys and presets

- Status: Accepted (the maintainer delegated these choices on 2026-10-24: "do what you think
  is best for the app")
- Date: 2026-10-24

## Context

Slice S2 maps an export's columns to customer, order ID, date and amount. Exports differ in
ways that change scores: line-item exports either repeat the order total on every line or put
it on the first line only; dates such as 03/04/2026 can be day-first or month-first; amounts
may use a decimal comma; some exports have a customer ID, others only an email. TRD §8 rule 1
says rows are grouped by order ID first, but not how an order's amount is read from its rows.

## Decision

1. **Order amount** is a per-file setting:
   - *One total per order* (default for every preset): an order's amount is its first
     non-empty amount; later rows of the same order add nothing. This is right for Shopify
     (total on the first line, blank after) and for exports that repeat the total.
   - *Each row is a product line*: the amounts of an order's rows are added up.
   Refund rows are handled by cleaning (S3), not here.
2. **Date order**: ISO dates (2026-04-03, with optional time and UTC offset) are read as is.
   For day/month/year dates, the order is detected from the preview rows: a first number above
   12 means day-first, a second number above 12 means month-first. If no row settles it, the
   user must choose, shown an example from their file. A time zone offset in the value is
   applied; values without one are read as UTC (ADR-0010).
3. **Amounts**: the decimal separator is detected from the preview rows (a comma followed by
   one or two digits at the end, and no point, means decimal comma) and can be changed.
   Currency symbols, letters, spaces and thousands separators are ignored; a leading minus or
   parentheses mean a negative amount.
4. **Customer key** (SCHEMA.md): the mapped customer ID when the row has one, otherwise the
   lower-cased, trimmed email. A row with neither cannot be used and is counted as unusable.
5. **Presets** are data in `core`: Shopify (from Shopify's documented order export columns),
   WooCommerce and Other. WooCommerce has no built-in order CSV with customer emails, and the
   plugins that add one name columns differently; the preset lists the names used by common
   plugins and is marked unverified until checked against a real (anonymised) header row.
   Every mapped field can be changed by the user.

## Consequences

- `OrderRow.amount` (TRD §7) becomes optional: an empty amount cell is not the same as 0
  under the default rule.
- A wrong amount setting changes M scores, so the mapping screen shows sample values from the
  file for every field.

## Governance

- Unit tests per rule; each preset maps an anonymised or synthetic header fixture.
- Changing these rules needs a new ADR.

## Notes

Sources checked for WooCommerce column names on 2026-10-24: woocommerce.com documentation for
Customer / Order / Coupon Export (lists formats but not column names) and GoDaddy's help pages
for the same plugin. Neither published the exact headers.
