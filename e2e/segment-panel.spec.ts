import { expect, test } from '@playwright/test';

// Regression: the sort arrows (U2) widened the segment table past its panel, clipping the revenue
// share. Browser zoom narrows the viewport the same way, so a narrow width covers it too.
test('the segment table fits its panel from a small phone to a wide screen', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try sample data' }).click();
  const table = page.getByRole('table', { name: 'Segments' });
  await table.waitFor();
  for (const width of [320, 375, 640, 768, 1024, 1100, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await table.evaluate((t) => {
      const panel = t.parentElement as HTMLElement;
      return panel.scrollWidth - panel.clientWidth;
    });
    expect(overflow, `${width} px wide`).toBe(0);
  }
});
