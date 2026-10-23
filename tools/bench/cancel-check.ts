// Starts an analysis, clicks Cancel, and checks the worker is gone and no result arrives.
import type { Browser } from '@playwright/test';

export async function checkCancel(
  browser: Browser,
  url: string,
  csvPath: string,
): Promise<string | undefined> {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(url);
    await page.setInputFiles('input[type=file]', csvPath);
    const cancel = page.getByRole('button', { name: 'Cancel' });
    await cancel.waitFor({ timeout: 10_000 });
    await cancel.click();
    // Longer than a full run takes, so a worker that kept going would have finished by now.
    await page.waitForTimeout(10_000);
    if ((await page.locator('output[data-status=done]').count()) > 0) {
      return 'Cancel: a result appeared after cancelling';
    }
    if (page.workers().length > 0) return 'Cancel: the worker is still running';
    if (await page.locator('input[type=file]').isDisabled()) {
      return 'Cancel: the file picker stayed disabled';
    }
    return undefined;
  } finally {
    await context.close();
  }
}
