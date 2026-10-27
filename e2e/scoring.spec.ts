import { expect, type Page, test } from '@playwright/test';
import { continueToColumns } from './steps.ts';

// Putler's 15-customer example (packages/core/src/fixtures/putler-15.ts) written as orders:
// each customer's last order is `recency` days before 2026-01-01 and their orders add up to
// the published monetary value.
const putler = [
  [1, 3, 6, 540],
  [2, 6, 10, 940],
  [3, 45, 1, 30],
  [4, 21, 2, 64],
  [5, 14, 4, 169],
  [6, 32, 2, 55],
  [7, 5, 3, 130],
  [8, 50, 1, 950],
  [9, 33, 15, 2430],
  [10, 10, 5, 190],
  [11, 5, 8, 840],
  [12, 1, 9, 1410],
  [13, 24, 3, 54],
  [14, 17, 2, 44],
  [15, 4, 1, 32],
] as const;

const day = (daysBefore: number) =>
  new Date(Date.UTC(2026, 0, 1) - daysBefore * 86_400_000).toISOString().slice(0, 10);

const csv = [
  'Customer ID,Order No,Date,Amount',
  ...putler.flatMap(([id, recency, orders, monetary]) =>
    Array.from({ length: orders }, (_, i) => {
      const amount = i === 0 ? monetary - (orders - 1) : 1;
      return `P${id},P${id}-${i},${day(recency + i)},${amount}`;
    }),
  ),
].join('\n');

async function analyse(page: Page, frequency: 'quantile' | 'fixed') {
  await page.goto('/');
  await page.getByRole('button', { name: 'Upload orders' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'putler.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await continueToColumns(page);
  await page.getByRole('button', { name: 'Confirm columns' }).click();
  await page.getByLabel('Another date').check();
  await page.getByLabel('Analysis date').fill('2026-01-01');
  await page.getByLabel('Frequency scoring').selectOption(frequency);
  await page.getByRole('button', { name: 'Run analysis' }).click();
  await expect(page.locator('output[data-status=done]')).toBeVisible();
}

const customersIn = (page: Page, segment: string) =>
  page.locator(`tr[data-segment="${segment}"] td[data-customers]`).getAttribute('data-customers');

test.describe('scoring rules (S4)', () => {
  test('Putler’s published scores give the expected segments with F by quintiles', async ({
    page,
  }) => {
    await analyse(page, 'quantile');
    const expected = {
      champions: 2, // 1 (R5 F4), 12 (R5 F5)
      'loyal-customers': 4, // 2, 7, 10, 11
      'need-attention': 1, // 5 (R3 F3)
      'about-to-sleep': 3, // 4, 6, 14
      'at-risk': 1, // 13 (R2 F3)
      'cant-lose-them': 1, // 9 (R1 F5)
      lost: 2, // 3, 8
      'new-customers': 1, // 15 (R5 F1)
    };
    for (const [segment, n] of Object.entries(expected)) {
      expect(await customersIn(page, segment), segment).toBe(String(n));
    }
    await expect(page.getByText('Frequency: quintiles')).toBeVisible();
  });

  test('the default fixed F breaks move customer 5 from Need attention to Loyal', async ({
    page,
  }) => {
    await analyse(page, 'fixed');
    expect(await customersIn(page, 'need-attention')).toBe('0');
    expect(await customersIn(page, 'loyal-customers')).toBe('5');
  });
});
