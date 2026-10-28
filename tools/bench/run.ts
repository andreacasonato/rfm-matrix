// Usage: node tools/bench/run.ts [--rows 1000000] [--runs 20]
// Loads the synthetic file into the built app in Chromium and checks the TRD §3 targets.
// Drives the real screens. Timed from Run analysis to segment counts ready (parse, aggregate,
// clean, score, segment); the preview's and the cleaning summary's own reads, and the save on
// this device that follows the grid (S8), are reported separately.
import { readFileSync, writeFileSync } from 'node:fs';
import { cpus, totalmem } from 'node:os';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { checkCancel } from './cancel-check.ts';
import { sampleMemory } from './memory.ts';
import { previewFile, runAnalysis, summariseFile } from './navigate.ts';
import { serve } from './serve.ts';

const { values } = parseArgs({
  options: {
    rows: { type: 'string', default: '1000000' },
    runs: { type: 'string', default: '20' },
  },
});
const rows = Number(values.rows);
const runs = Number(values.runs);
const targets = rows >= 1_000_000 ? { p50: 30_000, p95: 60_000 } : { p50: 3_000, p95: 6_000 };
const maxBlockMs = 100;
// Regression guard: about 860 MB for 1M rows before S6's string-retention bug; it reached 1.5 GB.
const maxMemoryMB = rows >= 1_000_000 ? 1200 : undefined;

const csvPath = resolve(`bench-data/orders-${rows}.csv`);
const expected = JSON.parse(readFileSync(`bench-data/orders-${rows}.expected.json`, 'utf8'));
const { url, server } = await serve(resolve('packages/app/dist'));
const browser = await chromium.launch();

const percentile = (sorted: number[], p: number) =>
  sorted[Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)] ?? Number.NaN;

const results: {
  wallMs: number;
  previewMs: number;
  summaryMs: number;
  longestBlockMs: number;
  peakMemoryBytes: number;
  saveMs: number;
}[] = [];
const mismatches: string[] = [];
let cancelFailure: string | undefined;

try {
  for (let run = 1; run <= runs; run++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.addInitScript(() => {
      const w = window as unknown as { longestTaskMs: number };
      w.longestTaskMs = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          w.longestTaskMs = Math.max(w.longestTaskMs, entry.duration);
        }
      }).observe({ type: 'longtask', buffered: true });
    });
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const before = await page.evaluate(
      () => (window as unknown as { longestTaskMs: number }).longestTaskMs,
    );
    const stopSampling = sampleMemory(process.pid);
    const previewMs = await previewFile(page, csvPath);
    const summaryMs = await summariseFile(page);
    await runAnalysis(page);
    const outcome = page.locator('output[data-status=done], [role=alert]');
    await outcome.waitFor({ timeout: 180_000 });
    const alert = await page.locator('[role=alert]').count();
    if (alert > 0)
      throw new Error(`Run ${run} failed: ${await page.locator('[role=alert]').innerText()}`);

    const output = page.locator('output[data-status=done]');
    const result = JSON.parse((await output.getAttribute('data-result')) ?? '{}');
    const wallMs = Number(await output.getAttribute('data-wall-ms'));
    // The save runs in the worker after the grid shows (S8); memory is sampled until it ends.
    const saveStarted = Date.now();
    const saved = page.getByText('Saved on this device.', { exact: true });
    const notSaved = page.getByText('This analysis was not saved on this device');
    await saved.or(notSaved).waitFor({ timeout: 180_000 });
    const saveMs = Date.now() - saveStarted;
    if ((await notSaved.count()) > 0) {
      mismatches.push(`run ${run}: not saved: ${await notSaved.locator('..').innerText()}`);
    }
    const longestBlockMs = Math.max(
      before,
      await page.evaluate(() => (window as unknown as { longestTaskMs: number }).longestTaskMs),
    );
    const peakMemoryBytes = stopSampling();
    await context.close();

    const checks: [string, number, number][] = [
      ['rows', result.rowsRead, expected.rows],
      ['unusable rows', result.invalidRows, expected.unusableRows],
      // Default cleaning leaves fully refunded orders out (ADR-0013).
      ['customers', result.customers, expected.cleaned.customers],
      ['orders', result.orders, expected.cleaned.orders],
      [
        'customers across segments',
        result.segments.segments.reduce(
          (n: number, seg: { customers: number }) => n + seg.customers,
          0,
        ),
        expected.cleaned.customers,
      ],
    ];
    for (const [name, got, want] of checks) {
      if (got !== want) mismatches.push(`run ${run}: ${name} ${got}, expected ${want}`);
    }
    if (Math.abs(result.monetaryTotal * 100 - expected.cleaned.totalCents) > 100) {
      mismatches.push(
        `run ${run}: total ${result.monetaryTotal}, expected ${expected.cleaned.totalCents / 100}`,
      );
    }
    results.push({ wallMs, previewMs, summaryMs, longestBlockMs, peakMemoryBytes, saveMs });
    console.log(
      `run ${run}/${runs}: ${(wallMs / 1000).toFixed(2)} s, saved in ${(saveMs / 1000).toFixed(2)} s, longest block ${longestBlockMs.toFixed(0)} ms`,
    );
  }
  // Cancel needs a run long enough to click during; small files finish first.
  if (rows >= 100_000) cancelFailure = await checkCancel(browser, url, csvPath);
} finally {
  await browser.close().catch(() => {});
  server.close();
}

const sorted = results.map((r) => r.wallMs).sort((a, b) => a - b);
const summary = {
  date: new Date().toISOString(),
  machine: `${cpus()[0]?.model ?? 'unknown'}, ${cpus().length} cores, ${Math.round(totalmem() / 2 ** 30)} GB`,
  browser: `Chromium ${browser.version()} (headless, Playwright)`,
  rows,
  runs,
  customers: expected.cleaned.customers,
  p50Ms: Math.round(percentile(sorted, 50)),
  p95Ms: Math.round(percentile(sorted, 95)),
  rowsPerSecondAtP50: Math.round(rows / (percentile(sorted, 50) / 1000)),
  // The upload preview and the cleaning summary each read the file once before the analysis.
  previewP50Ms: Math.round(
    percentile(
      results.map((r) => r.previewMs).sort((a, b) => a - b),
      50,
    ),
  ),
  summaryP50Ms: Math.round(
    percentile(
      results.map((r) => r.summaryMs).sort((a, b) => a - b),
      50,
    ),
  ),
  // From the grid showing to "Saved on this device." (S8); no TRD target, reported only.
  saveP50Ms: Math.round(
    percentile(
      results.map((r) => r.saveMs).sort((a, b) => a - b),
      50,
    ),
  ),
  saveMaxMs: Math.round(Math.max(...results.map((r) => r.saveMs))),
  longestMainThreadBlockMs: Math.round(Math.max(...results.map((r) => r.longestBlockMs))),
  // Resident memory of all Chromium processes, sampled every 250 ms during each run.
  peakBrowserMemoryMB: Math.round(Math.max(...results.map((r) => r.peakMemoryBytes)) / 2 ** 20),
  cancelChecked: rows >= 100_000,
  mismatches,
};
writeFileSync(`bench-data/results-${rows}.json`, `${JSON.stringify(summary, null, 2)}\n`);
console.log(summary);

const failures = [
  summary.p50Ms > targets.p50 && `p50 ${summary.p50Ms} ms is over ${targets.p50} ms`,
  summary.p95Ms > targets.p95 && `p95 ${summary.p95Ms} ms is over ${targets.p95} ms`,
  summary.longestMainThreadBlockMs > maxBlockMs &&
    `main thread blocked ${summary.longestMainThreadBlockMs} ms (limit ${maxBlockMs} ms)`,
  mismatches.length > 0 && `${mismatches.length} result mismatches`,
  maxMemoryMB !== undefined &&
    summary.peakBrowserMemoryMB > maxMemoryMB &&
    `browser memory peaked at ${summary.peakBrowserMemoryMB} MB (limit ${maxMemoryMB} MB)`,
  cancelFailure,
].filter(Boolean);
console.log(failures.length ? `FAIL: ${failures.join('; ')}` : 'PASS: all targets met');
process.exit(failures.length ? 1 : 0);
