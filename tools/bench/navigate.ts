// Drives the app's real screens: Start → Upload orders → preview → Continue → Confirm columns
// → cleaning summary → Run analysis.
import type { Page } from '@playwright/test';

const longWait = { timeout: 180_000 };

/** Uploads the file and waits for its preview; returns how long the preview took in ms. */
export async function previewFile(page: Page, csvPath: string): Promise<number> {
  await page.getByRole('button', { name: 'Upload orders' }).click();
  const started = Date.now();
  await page.locator('input[type=file]').setInputFiles(csvPath);
  await page.getByRole('button', { name: 'Continue' }).waitFor(longWait);
  return Date.now() - started;
}

/** Confirms the guessed columns and waits for the cleaning summary; returns its time in ms. */
export async function summariseFile(page: Page): Promise<number> {
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Confirm columns' }).click();
  const started = Date.now();
  await page.getByRole('button', { name: 'Run analysis' }).waitFor(longWait);
  return Date.now() - started;
}

/** Runs the analysis with the default cleaning rules. */
export async function runAnalysis(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Run analysis' }).click();
}
