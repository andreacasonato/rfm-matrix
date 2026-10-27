// The diagnostics panel's facts (TRD §12): version, browser, the last run and the last error,
// to copy into a GitHub issue. No customer data: errors are scrubbed of quoted values and emails,
// and file names are never kept.
import { appVersion } from './version';

type Run = {
  rowsRead: number;
  rowsUsed: number;
  customers: number;
  orders: number;
  elapsedMs: number;
};

let lastRun: Run | undefined;
let lastError: string | undefined;
let storage = 'checking';

/** Removes text that may come from the user's file: anything in quotes, and emails. */
export const scrub = (text: string) =>
  text.replace(/"[^"]*"/g, '"…"').replace(/[^\s"'<>]+@[^\s"'<>]+/g, '[email]');

export function recordRun(run: Run) {
  lastRun = run;
}

export function recordError(message: string) {
  lastError = scrub(message);
}

export function recordStorage(state: string) {
  storage = state;
}

export function resetDiagnostics() {
  lastRun = undefined;
  lastError = undefined;
  storage = 'checking';
}

const count = (n: number) => n.toLocaleString('en-US');

type Context = { userAgent: string; storage?: string; title?: string };

export function diagnosticsText({ userAgent, storage: state = storage, title }: Context): string {
  const run = lastRun
    ? `${count(lastRun.rowsRead)} rows read, ${count(lastRun.rowsUsed)} used, ${count(lastRun.customers)} customers, ${count(lastRun.orders)} orders, ${Math.round(lastRun.elapsedMs)} ms`
    : 'none in this tab';
  const shownTitle = title === undefined ? undefined : scrub(title);
  const error =
    shownTitle && lastError && lastError !== shownTitle
      ? `${shownTitle} (${lastError})`
      : (shownTitle ?? lastError ?? 'none');
  return [
    `RFM Matrix ${appVersion}`,
    `Browser: ${scrub(userAgent)}`,
    `Storage on this device: ${state}`,
    `Last analysis: ${run}`,
    `Last error: ${error}`,
  ].join('\n');
}
