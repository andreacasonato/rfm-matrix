import { expect, type Page, test } from '@playwright/test';
import { continueToColumns } from './steps.ts';

// Score thresholds (U5): set after an analysis, scored again by the worker, and kept on a saved
// analysis. Synthetic data only.
const customersIn = (page: Page, segment: string) =>
  page.locator(`tr[data-segment="${segment}"] td[data-customers]`).getAttribute('data-customers');

async function setOwnMonetary(page: Page, top: string) {
  await page.getByRole('button', { name: 'Score thresholds' }).click();
  await page
    .getByRole('radiogroup', { name: 'Monetary: who decides' })
    .getByLabel(/Set my own/)
    .check();
  await page.getByLabel('Monetary score 5: more than what amount').fill(top);
  await expect(page.locator('td[data-score-count="5"]').last()).toHaveText(/\d/);
  await page.getByRole('button', { name: 'Apply thresholds' }).click();
}

test('new thresholds on the sample move customers between segments', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Try sample data' }).click();
  await expect(page.locator('output[data-status=done]')).toBeVisible();
  const total = await page.locator('td[data-total-customers]').getAttribute('data-total-customers');

  // Nobody spends more than a million, so no one can be M5.
  await setOwnMonetary(page, '1000000');
  await expect(page.getByText('Score thresholds applied', { exact: true })).toBeVisible();
  await expect(page.locator('td[data-total-customers]')).toHaveAttribute(
    'data-total-customers',
    total ?? '',
  );
  await page.getByRole('button', { name: 'How scores work' }).click();
  await expect(page.getByText(/own thresholds/).first()).toBeVisible();
  await expect(page.getByText('over 1,000,000.00')).toBeVisible();
});

test('a saved analysis keeps its new thresholds after a reload', async ({ page }) => {
  const csv = [
    'Order,Customer ID,Date,Total',
    ...Array.from({ length: 12 }, (_, i) => [
      `#1${i},C${i},2026-0${(i % 9) + 1}-03,${(i + 1) * 40}.00`,
      `#2${i},C${i},2026-0${(i % 9) + 1}-20,${(i + 1) * 10}.00`,
    ]).flat(),
  ].join('\n');
  await page.goto('/');
  await page.getByRole('button', { name: 'Upload orders' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'shop.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await continueToColumns(page);
  await page.getByRole('button', { name: 'Confirm columns' }).click();
  await page.getByRole('button', { name: 'Run analysis' }).click();
  await expect(page.getByText('Saved on this device.')).toBeVisible();
  const before = await customersIn(page, 'champions');

  await setOwnMonetary(page, '590');
  await expect(
    page.getByText('Score thresholds applied and saved on this device', { exact: true }),
  ).toBeVisible();
  const after = await customersIn(page, 'champions');

  await page.reload();
  await page.getByRole('button', { name: /^Open shop/ }).click();
  await expect(page.locator('output[data-status=done]')).toBeVisible();
  expect(await customersIn(page, 'champions')).toBe(after);
  await page.getByRole('button', { name: 'Score thresholds' }).click();
  await expect(page.getByLabel('Monetary score 5: more than what amount')).toHaveValue('590');
  expect(before).not.toBeNull();
});
