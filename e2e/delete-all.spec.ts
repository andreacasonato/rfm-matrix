import { expect, test } from '@playwright/test';

const csv = [
  'Order,Customer ID,Date,Total',
  ...Array.from({ length: 12 }, (_, i) => `#${i},C${i % 6},2026-0${(i % 9) + 1}-05,${10 + i}.00`),
].join('\n');

test('Delete all data leaves nothing on the device (S8, APP_FLOW)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Upload orders' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'shop.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Confirm columns' }).click();
  await page.getByRole('button', { name: 'Run analysis' }).click();
  await expect(page.getByText('Saved on this device.')).toBeVisible();

  await page.getByRole('button', { name: 'Start over' }).click();
  await page.getByRole('button', { name: 'Project and data' }).click();
  await expect(page.getByRole('heading', { name: 'shop' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete all data' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete all data?' });
  await expect(dialog).toContainText('1 project and 1 saved analysis');
  await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
  await dialog.getByRole('button', { name: 'Delete' }).click();

  await expect(page.getByText('All data on this device was deleted.')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Saved on this device' })).toHaveCount(0);
  const names = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  expect(names).not.toContain('rfm-matrix');
  await page.reload();
  await expect(page.getByRole('list', { name: 'Saved on this device' })).toHaveCount(0);
});
