import { expect, type Page, test } from '@playwright/test';

// The bundled sample has 540 customers after the default cleaning (ADR-0013).
async function openSample(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await expect(page.locator('output[data-status=done]')).toBeAttached();
}

const heatmap = (page: Page) =>
  page.getByRole('table', { name: 'Customers by recency and frequency' });

test.describe('RFM grid (S5)', () => {
  test('grid cells and tiles add up to the cleaned totals', async ({ page }) => {
    await openSample(page);
    const labels = await heatmap(page)
      .getByRole('cell')
      .evaluateAll((cells) => cells.map((c) => c.getAttribute('aria-label') ?? ''));
    expect(labels).toHaveLength(25);
    const total = labels.reduce(
      (n, label) => n + Number(/: ([\d,]+) customers/.exec(label)?.[1]?.replaceAll(',', '')),
      0,
    );
    expect(total).toBe(540);
    await expect(page.getByRole('list', { name: 'Summary' })).toContainText('Customers540');
    await expect(page.locator('td[data-total-customers]')).toHaveAttribute(
      'data-total-customers',
      '540',
    );
  });

  test('cells fill once when the analysis finishes', async ({ page }) => {
    await openSample(page);
    const animation = await heatmap(page)
      .getByRole('cell', { name: /^Champions/ })
      .first()
      .evaluate((cell) => getComputedStyle(cell).animationName);
    expect(animation).toBe('heat-fill');
  });

  test('there is no animation with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openSample(page);
    const animations = await heatmap(page)
      .getByRole('cell')
      .evaluateAll((cells) => cells.map((c) => getComputedStyle(c).animationName));
    expect(new Set(animations)).toEqual(new Set(['none']));
  });
});
