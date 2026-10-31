import { expect, type Page, test } from '@playwright/test';

// Regression: the sort arrows (U2) widened the segment table past its panel, clipping the revenue
// share. Browser zoom narrows the viewport the same way, so a narrow width covers it too. CI also
// caught it before the bundled font had loaded, so the table must fit in a fallback font as well.
async function overflowAt(page: Page, widths: number[]) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try sample data' }).click();
  const table = page.getByRole('table', { name: 'Segments', exact: true });
  await table.waitFor();
  const found: Record<number, number> = {};
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    found[width] = await table.evaluate((t) => {
      const panel = t.parentElement as HTMLElement;
      return panel.scrollWidth - panel.clientWidth;
    });
  }
  return found;
}

const widths = [320, 375, 640, 768, 1024, 1100, 1280, 1440];
const none = Object.fromEntries(widths.map((w) => [w, 0]));

test('the segment table fits its panel from a small phone to a wide screen', async ({ page }) => {
  expect(await overflowAt(page, widths)).toEqual(none);
});

test('it fits before the bundled font has loaded, too', async ({ page }) => {
  await page.route('**/*.woff2', (route) => route.abort());
  expect(await overflowAt(page, widths)).toEqual(none);
});
