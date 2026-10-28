import { expect, test } from '@playwright/test';
import { continueToColumns } from './steps.ts';

// APP_FLOW states the unit tests cannot reach through the real worker.
test('a file with fewer than 5 customers explains why it cannot be scored (TRD §11)', async ({
  page,
}) => {
  const csv = ['Customer ID,Order No,Date,Amount', 'A,1,2026-01-02,10', 'B,2,2026-01-03,20'];
  await page.goto('/');
  await page.getByRole('button', { name: 'Upload orders' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'two-customers.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv.join('\n')),
  });
  await continueToColumns(page);
  await page.getByRole('button', { name: 'Confirm columns' }).click();
  await page.getByRole('button', { name: 'Run analysis' }).click();
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Too few customers to score');
  await expect(alert).toContainText('This file has 2 customers');
  await expect(alert.getByText('Diagnostics', { exact: true })).toBeVisible();
});
