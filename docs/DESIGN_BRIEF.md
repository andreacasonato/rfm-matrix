# Doc 4 · Design brief and design system

Status: approved 2026-10-23 (orange accent; dark mode in v1; friendly, simple, clear).

A light grey canvas, white surfaces, and one orange accent used only where a number needs attention. The one bold element is the RFM grid, drawn as a tinted heatmap. Built from 11 maintainer-supplied references.

## What we take from the references

| # | Reference | Take (the principle) | Leave |
| --- | --- | --- | --- |
| 1 | Orange sales dashboard | One accent marks the item in focus; tinted-pill heatmap is the model for the RFM grid | Score gauge, emoji, decorative mini-charts |
| 2 | Blue CRM | Related series as shades of one hue; status cards with a coloured bar per state | Forecast band, "Ask AI" |
| 3 | Tasks and invoices | Labelled progress bars with count and percentage | Many unrelated hues; donut chart |
| 4 | Deal page | Large plain title, back breadcrumb, tabs, stat tiles: model for Segment detail | Avatars, coloured Mail/Call buttons |
| 5 | Admin dashboard | Generous whitespace; plain table with clear headings | Big icon tiles, floating button, heavy shadows |
| 6–8 | Customer tables | Tabs, filter row, table with inline bar and percentage, mobile layout that stacks | Purple accent, avatar stacks |
| 9 | Orange product revenue | Highlighted pair vs muted bars; range control; status pills as tint plus text | Hatched texture everywhere |
| 10 | EV charging dashboard | A solid accent panel used once | Illustrations, promo card |
| 11 | Investment dashboard | Calm large numbers; status as dot plus word | Lime colour, illustrations |

## The brief

**Message:** at a glance I see where my customers and revenue sit, and which group needs me this week.

1. **Product:** a free, open-source RFM grid for e-commerce order exports.
2. **Audience:** small store owners, not analysts.
3. **The grid page's one job:** show which segment to act on first.
4. **Three adjectives:** friendly, simple, clear.
5. **Must not resemble:** classic AI-generated design. No Inter or Roboto, purple gradients, glassmorphism, emoji icons or centred hero with three cards; fewer than eight of the playbook's 46 "AI look" tells before shipping.

**Task paragraph:** a store owner arrives after uploading last month's orders. They must first see the grid with customer counts and revenue share per segment. The easiest action is opening a segment and exporting it.

**Palette source:** references 1 and 9: orange marks heat (attention, recent activity); grey means quiet.

**Typefaces:** Geist for all UI text (display 600, body 400); Geist Mono only in numeric table columns. Bundled locally from Vercel's files (SIL OFL 1.1, ship `OFL.txt`), not the Google Fonts copy, which lacks the full glyph set and font-feature-settings needed for tabular figures.

**Grid page sketch:**

```text
+--------------------------------------------------------------+
| Store name            [Overview | Segments | Movement]  Export |
+--------------------------------------------------------------+
| Customers 4,812 | Revenue $412k | Repeat 38% | Analysed 21 Oct |
+--------------------------------------+-----------------------+
| RFM grid: 5x5 heatmap, R down, F across | Segment list        |
| cell = count, tint = share            | name, count, share,   |
| segment outlines over cells           | revenue bar           |
+--------------------------------------+-----------------------+
```

Left-aligned text; numbers right-aligned in tables.

**Real content:** an anonymised sample store, real segment names, long and short customer IDs, and a store with very few repeat buyers.

## Design tokens (light)

Contrast ratios use the WCAG 2 relative-luminance formula; AA needs 4.5:1 for normal text.

| Token | Value | Role | Contrast |
| --- | --- | --- | --- |
| `--color-canvas` | #EEF0F2 | Page background | — |
| `--color-surface` | #FFFFFF | Panels and tables | — |
| `--color-border` | #E3E5E8 | Dividers | Decorative only |
| `--color-control-border` | #80868F | Edges of inputs, selects and buttons (added in M5) | 3.67:1 on white; 3.21:1 on canvas (WCAG 1.4.11 needs 3:1) |
| `--color-text-primary` | #16181D | Main text, tooltip background | 17.76:1 on white |
| `--color-text-secondary` | #5F6672 | Labels, helper text | 5.78:1 on white; 5.06:1 on canvas |
| `--color-action-primary` | #F2541B | Primary button fill, focus item, top heat step | Dark text 5.12:1 (white 3.47:1 fails, so buttons use dark text) |
| `--color-action-text` | #B93A0E | Links and accent text on white | 5.72:1 |
| `--color-heat-1`…`-5` | #FFF1EA, #FFD5C2, #FFAE8A, #FF7F4D, #F2541B | Heatmap steps | Dark text 16.09, 13.15, 9.87, 7.10, 5.12:1 |
| `--color-positive` | #0E7342 on #E7F6EE | Up deltas, Thriving | 5.30:1 |
| `--color-warning` | #A15C00 on #FFF4E0 | Slipping | 4.76:1 |
| `--color-negative` | #C2263A on #FDECEE | Down deltas, At risk | 5.07:1 |

## Design tokens (dark, v1)

Same token names; follows the system setting with a manual toggle.

| Token | Dark value | Contrast |
| --- | --- | --- |
| `--color-canvas` | #0F1115 | — |
| `--color-surface` | #171A20 | — |
| `--color-border` | #2A2E36 | Decorative only |
| `--color-control-border` | #68707D | 3.49:1 on surface; 3.78:1 on canvas |
| `--color-text-primary` | #ECEEF1 | 14.99:1 on surface |
| `--color-text-secondary` | #A3A9B4 | 7.38:1 on surface; 8.00:1 on canvas |
| `--color-action-primary` | #FF6A33 | Dark text #16181D 6.23:1 |
| `--color-action-text` | #FF8A5C | 7.50:1 on surface |
| `--color-heat-1`…`-5` | #2A1C16, #4A2516, #7A3415, #A83C16, #FF6A33 | Light text steps 1–4: 14.16, 11.53, 7.76, 5.44:1; dark text step 5: 6.23:1 |
| `--color-positive` | #4CC38A on #12291E | 6.96:1 |
| `--color-warning` | #F0B04A on #2E2310 | 8.07:1 |
| `--color-negative` | #FF7A85 on #33161B | 6.59:1 |

The tooltip stays dark in both themes (#16181D with #ECEEF1, 15.28:1).

## Segment families

Always shown with the segment name, never colour alone.

| Family | Segments | Colour |
| --- | --- | --- |
| Thriving | Champions, Loyal customers | Positive |
| Growing | New customers, Promising, Potential loyalists | Accent tint |
| Slipping | Need attention, About to sleep | Warning |
| At risk | At risk, Can't lose them | Negative |
| Gone | Hibernating, Lost | Neutral grey |

## Scales

- **Type:** page title 28/36 at 600; section 18/26 at 600; body 14/22 at 400; small 12/18 at 400; big numbers 28/36 at 600; table numbers Geist Mono 13/20.
- **Spacing:** 4, 8, 12, 16, 24, 32, 48 px.
- **Radius by role:** controls 8 px; panels 12 px; pills fully rounded; heatmap cells 6 px.
- **Elevation:** panels use a border, no shadow; only menus, tooltips and dialogs get one shadow level.

## Components

Each with hover, active, focus, disabled, loading, empty and error states: button (primary, secondary, quiet); tabs; segmented control; stat tile with delta pill; status pill; data table with inline bar; heatmap cell; dark tooltip; upload drop zone; column-mapping row; progress bar; dialog; toast; empty state.

## Build and lock

1. Build the grid screen once without and once with the design system; iterate; update the system to match.
2. Lock tokens as CSS custom properties and a Tailwind theme that **replaces** the default palette.
3. Lint rule fails the build on raw hex values and banned classes.
4. `DESIGN.md` rules for the AI (copy into the repo root):
   - Only theme tokens; no raw hex.
   - Geist 600 headings, 400 body; Geist Mono only for table numbers; no third family.
   - No emoji icons, gradient text, glassmorphism or decorative illustrations.
   - Lucide icons only, and only where they label an action.
   - One animated moment: heatmap cells fill once when an analysis finishes; off under `prefers-reduced-motion`.
   - Button labels name the outcome ("Export Champions"), no trailing arrows.
   - Same verbs as APP_FLOW.md.
   - Screenshot mobile and desktop, light and dark, before finishing any UI task.

## Self-critique

The stat-tile row is the most generic part. It is limited to four tiles, without shadows, with radius varied by role. The heatmap is where the product looks like itself, so it gets the accent and the only animation.
