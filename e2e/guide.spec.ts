import { expect, test } from '@playwright/test';

// The Guide opens from the name bar on any screen and Back returns to that screen exactly as it
// was (U4): the screen is hidden, not closed, so even a sorted grid stays sorted.
test('the Guide opens over the grid and Back returns to it unchanged', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Guide' })).toBeVisible();
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await expect(page.locator('output[data-status=done]')).toBeVisible();
  await page.getByRole('button', { name: /^Revenue/ }).click();
  const order = await page
    .locator('tr[data-segment]')
    .evaluateAll((rows) => rows.map((r) => r.getAttribute('data-segment')));

  await page.getByRole('button', { name: 'Guide' }).click();
  await expect(page.getByRole('heading', { name: 'Guide' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Choosing your own thresholds' })).toBeVisible();
  await expect(page.getByRole('table', { name: 'Segments', exact: true })).toBeHidden();

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByRole('table', { name: 'Segments', exact: true })).toBeVisible();
  const after = await page
    .locator('tr[data-segment]')
    .evaluateAll((rows) => rows.map((r) => r.getAttribute('data-segment')));
  expect(after).toEqual(order);
  await expect(page.getByRole('columnheader', { name: /Revenue/ })).toHaveAttribute(
    'aria-sort',
    'descending',
  );
});
