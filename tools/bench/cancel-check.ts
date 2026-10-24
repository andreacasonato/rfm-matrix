// Starts an analysis, clicks Cancel, and checks the worker is gone and no result arrives.
import type { Browser } from '@playwright/test';
import { previewFile, runAnalysis } from './navigate.ts';

export async function checkCancel(
  browser: Browser,
  url: string,
  csvPath: string,
): Promise<string | undefined> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(url);
    await previewFile(page, csvPath);
    await runAnalysis(page);
    const cancel = page.getByRole('button', { name: 'Cancel' });
    await cancel.waitFor({ timeout: 10_000 });
    await cancel.click();
    // Longer than a full run takes, so a worker that kept going would have finished by now.
    await page.waitForTimeout(10_000);
    if ((await page.locator('output[data-status=done]').count()) > 0) {
      return 'Cancel: a result appeared after cancelling';
    }
    if (page.workers().length > 0) return 'Cancel: the worker is still running';
    if ((await page.getByText('Analysis cancelled').count()) === 0) {
      return 'Cancel: the page did not say the analysis was cancelled';
    }
    return undefined;
  } finally {
    await context.close();
  }
}
