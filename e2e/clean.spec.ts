import { expect, test } from '@playwright/test';
import { continueToColumns } from './steps.ts';

// The hand-counted fixture from packages/core/src/fixtures/cleaning-orders.ts as a CSV file.
const csv = [
  'Customer ID,Order No,Date,Amount,Status,Refunded,Tax,Shipping',
  'c1,#1,2026-03-01,100,paid,10,20,5',
  'c1,#1,,,,,,',
  'c1,#2,2026-05-01,50,paid,,,',
  'c2,#3,2026-04-01,80,cancelled,,,',
  'c2,#4,2026-04-02,60,refunded,,,',
  'c2,#5,2026-04-03,40,partially_refunded,15,,',
  'c3,#6,2025-01-10,30,paid,,,',
  'c3,#7,2026-06-01,20,paid,,,',
  'c4,#8,2026-02-01,25,pending,,,',
  'c4,#9,2026-02-02,1,Test,,,',
  'c5,#10,2026-01-15,70,paid,,,',
  'c5,R10,2026-01-20,-20,,,,',
  'c6,R11,2026-03-03,-30,,,,',
  'c7,#12,2026-05-05,45,,,,',
  'c8,#13,,10,paid,,,',
  'c9,#14,2026-07-01,35,paid,,,',
].join('\n');

test('cleaning counts match the hand-counted fixture (S3 proof)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Upload orders' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'cleaning.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await continueToColumns(page);
  await page.getByRole('button', { name: 'Confirm columns' }).click();

  await expect(page.getByLabel(/cancelled · 1 order/)).not.toBeChecked();
  await expect(page.getByLabel(/partially refunded · 1 order/)).toBeChecked();
  await page.getByLabel('Another date').check();
  await page.getByLabel('Analysis date').fill('2026-06-02');
  await page.getByLabel('Orders to include').selectOption('365');

  const counts = page.getByTestId('exclusion-counts');
  await expect(counts).toContainText('6 orders will be analysed');
  await expect(counts).toContainText('4 left out by status');
  await expect(counts).toContainText('1 after the analysis date');
  await expect(counts).toContainText('1 before the window');
  await expect(counts).toContainText('1 without a date');

  await page.getByRole('button', { name: 'Run analysis' }).click();
  const output = page.locator('output[data-status=done]');
  await expect(output).toBeVisible();
  const result = JSON.parse((await output.getAttribute('data-result')) ?? '{}');
  expect(result).toMatchObject({ customers: 5, orders: 6, monetaryTotal: 280 });
  expect(result.cleaning).toMatchObject({ refundsApplied: 2, customersWithoutOrders: 4 });
  await expect(page.getByText(/Orders left out: 4 by status/)).toBeVisible();
});
