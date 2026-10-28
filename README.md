# RFM Matrix

See who your best, slipping and lost repeat customers are, from your shop's order export, in
a few minutes. Free, open source (MIT), and private: your file never leaves your computer.

**Open the app:** https://andreacasonato.github.io/rfm-matrix/

## What it does

1. **Upload** your order export as a CSV file (Shopify, WooCommerce or any other shop).
2. **Check the columns** it guessed: customer, order ID, date and amount.
3. **Choose which orders count**: statuses, refunds, gross or net, and the analysis date.
4. **Run analysis.** Every customer gets a score from 1 to 5 for Recency, Frequency and
   Monetary value, and lands in one of 11 segments, from Champions to Lost.
5. **Open a segment** to see who is in it and what to do about them, then **Export** the list as
   a CSV for your email tool.

Next month, upload a new export into the same project to see who moved between segments.

No file to hand? Press **Try sample data** on the start screen.

## Your data stays on your device

- The file is read and scored inside your browser. There is no server, no account and no
  analytics; the page makes no network request after it loads, and a Content-Security-Policy
  blocks any that code might try.
- Only per-customer totals are saved, in your browser's storage on this device. Raw order rows,
  names, addresses and phone numbers are never stored.
- **Save project file** keeps a copy you control; **Delete all data** removes every project and
  result from this device.
- After the first visit the app also works offline.

Browsers can clear their storage, so save a project file if you want to keep your results.

## How scores work

- **Recency:** whole days since the customer's last order, counted to the analysis date
  (by default the day after the latest order in the file). More recent scores higher.
- **Frequency:** distinct orders. By default 1, 2, 3, 4–5 and 6+ orders score 1 to 5, because
  most shops have many one-time buyers.
- **Monetary:** total spent, gross or net, with refunds taken off if you choose.
- Recency and Monetary scores split customers into fifths: 20th, 40th, 60th and 80th
  percentiles. Equal values always get equal scores.
- Segments come from Recency × Frequency; Monetary sorts customers within a segment. You can
  change which scores belong to which segment in **Edit segment rules**.

The **How scores work** screen shows the cut points and bin sizes for your own data. The full
rules are in [TRD §8](docs/TRD.md) and the default segments in [SCHEMA.md](docs/SCHEMA.md).

RFM describes what customers did, not what they will do. Use it to choose who to talk to
first.

## Limits

- CSV only for now. Save an Excel file as CSV first.
- Files up to 320 MB. A 1,000,000-row file scores in under a minute on a mid-range laptop.
- One currency per file.
- English only.

## Found a bug?

Every error message has a **Diagnostics** panel. Copy its report (it contains no customer
data) into a [GitHub issue](https://github.com/andreacasonato/rfm-matrix/issues) with the steps
that led to it.

## For developers

Requires Node 24 and pnpm (via `corepack enable`).

```sh
pnpm install
pnpm --filter @rfm-matrix/app dev   # the app at http://localhost:5173
pnpm lint && pnpm typecheck && pnpm test
pnpm test:e2e                       # builds, then runs Playwright in Chromium
pnpm bench:ci                       # the 100,000-row benchmark
```

| Package | What it holds |
| --- | --- |
| `packages/core` | Scoring rules, the segment map and movement. Pure functions, no UI or browser APIs |
| `packages/io` | Streaming CSV reading and safe CSV export |
| `packages/app` | The React app, the Web Worker that parses and scores, and IndexedDB storage |

Start with [CONTRIBUTING.md](CONTRIBUTING.md), then the product and technical docs in
[`docs/`](docs/) and the decision records in [`docs/adr/`](docs/adr/). AI coding agents follow
[AGENTS.md](AGENTS.md).

## License

[MIT](LICENSE)
