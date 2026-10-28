import { expect, test } from '@playwright/test';

// TRD §2 and ADR-0020: after one visit, the app opens and runs an analysis with no network.
test('works offline after the first load', async ({ page, context }) => {
  await page.goto('/');
  // Ready means installed: every file of the app is stored.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await expect(page.locator('output[data-status=done]')).toBeVisible();
  await expect(page.getByText('Champions').first()).toBeVisible();
});
