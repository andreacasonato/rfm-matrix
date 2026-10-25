# ADR-0014: Safe CSV export and the default segment texts

- Status: Accepted (approved by the maintainer on 2026-10-25)
- Date: 2026-10-25

## Context

Slice S6 exports a segment as CSV for email tools and spreadsheets (PRD story 7). AGENTS.md
requires escaping cells that start with `=`, `+`, `-` or `@`, because spreadsheets can run them
as formulas. Applied to every cell, that rule would also turn a negative spend (`-20.00`, after
refunds) into text, breaking sums. The segment detail screen also needs a definition and a
suggested action per segment, which SCHEMA.md lists as fields of the segment map without
giving their text.

## Decision

1. **Text cells** (anything copied from the file, plus headers and segment names) that start
   with `=`, `+`, `-`, `@`, a tab or a carriage return get a leading `'` (OWASP's advice, which
   adds tab and carriage return to the AGENTS.md list).
2. **Numbers the app computes** (spend, recency, orders, scores) are written as plain numbers.
   They are never copied from the file, so they cannot carry formula text.
3. Files are UTF-8 with a byte-order mark, RFC 4180 quoting and CRLF line endings, so Excel
   opens them correctly; they are created in the browser and never sent anywhere.
4. The default segment map gains, for each of the 11 segments, a plain-words definition and a
   suggested action, written for this project as a paraphrase of common RFM guidance (see
   `packages/core/src/segment-texts.ts`).

## Consequences

- An exported customer ID like `=HYPERLINK(...)` shows with a leading `'` in the spreadsheet.
- A spreadsheet user sees real numbers for money and scores.

## Governance

- Tests cover every escaped start character, quoting round trips, BOM and CRLF, and an
  end-to-end export of a hostile file.
- Changing the escaping rule or the default texts needs a new ADR.

## Notes

None.
