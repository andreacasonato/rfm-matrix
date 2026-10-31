# Changelog

What changed in each release, written for the people who use the app. Versions follow
[docs/RELEASE.md](docs/RELEASE.md).

## Unreleased

### New

- **Score thresholds:** decide what a customer needs for each score from 1 to 5, in plain words
  ("M5: spent more than 300", "R5: ordered within 30 days"), and see how many of your customers
  each score holds before you apply it. Open it from the grid after an analysis, or use the same
  cards on Clean and settings. A saved analysis keeps the new thresholds.
- **Guide:** what RFM is, how scores and segments work, and how to use the app, from the name bar
  on every screen.
- **Sort the segment list** by customers, share or revenue, highest or lowest first.
- **Movement** warns when two analyses used different score thresholds.

### Better

- The sample store is dated by your computer's clock, so it always looks current.
- Everything clickable shows the hand cursor.
- Disabled buttons are readable instead of faded; revenue bars and the heatmap caption are
  clearer, especially in the dark theme.
- The segment list fits its panel on small phones and zoomed-in screens.

## 0.1.0 (2026-10-30)

The first release, for early testers.

### What you can do

- **Upload** an order export as a CSV, up to 320 MB, and see a preview before anything is
  scored. Excel files get a plain message asking you to save them as CSV first.
- **Answer three questions** on your first upload (which shop, one row per order or per item,
  and the analysis date), and the next steps are filled in for you.
- **Check the columns** with presets for Shopify, WooCommerce and other shops.
- **Choose which orders count**: order statuses, gross or net amounts, refunds, and the analysis
  date. The app shows how many orders it left out and why.
- **Run analysis** and see your customers in a grid of 11 segments, from Champions to Lost, with
  the count and share of revenue for each.
- **Open a segment** to see its customers and a suggested action, and **Export** them as a CSV
  for your email tool.
- **Edit segment rules** to move scores between segments, with Undo, Reset to default, and rules
  files you can export and open.
- **Save project** results on this device and open them again from Start. Add next month's
  export to the same project.
- **Movement:** compare two analyses of the same shop to see who moved between segments, and
  export the customers who moved.
- **Save project file** to keep a copy you control, and **Open project file** on another
  computer.
- **Delete all data** deletes every project and result from this device.
- **Try sample data** reaches the grid in one click.
- **How scores work** shows the cut points and score ranges for your own data.

### Privacy and safety

- Everything runs in your browser. No server, no account, no analytics, and no network request
  after the page loads; a Content-Security-Policy blocks any that code might try.
- Only per-customer totals are saved. Raw order rows, names, addresses and phone numbers are
  never stored.
- Exported cells that a spreadsheet could run as a formula are escaped.
- Works offline after the first visit.

### Reliability

- A progress bar while a large file is read, and a plain message when a file has too few
  customers to score.
- Every error has a **Diagnostics** panel with a report you can copy, and **Report a bug**
  beside it. The report holds no customer data.
- **Feedback** at the top of every screen opens the project's issues on GitHub.
- Every screen meets WCAG AA contrast and passes automated accessibility checks.
- A 100,000-row file is scored on every change to the code, so the app stays fast.
