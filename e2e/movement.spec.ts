import { readFile } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';
import { continueToColumns } from './steps.ts';

const header = 'Order,Customer ID,Date,Total';
// Ten customers in spring; by autumn four of them buy again, one is gone and one is new.
const spring = Array.from({ length: 20 }, (_, i) => {
  const c = i % 10;
  return `#${i},C${c},2026-0${(c % 5) + 1}-1${i % 9},${10 + c * 3}.00`;
});
const autumn = [
  ...spring.filter((row) => !row.includes(',C9,')),
  '#100,C0,2026-09-20,40.00',
  '#101,C1,2026-09-21,45.00',
  '#102,C2,2026-09-22,50.00',
  '#103,C3,2026-09-23,55.00',
  '#104,C10,2026-09-24,60.00',
];

async function analyse(page: Page, name: string, rows: string[]) {
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name,
      mimeType: 'text/csv',
      buffer: Buffer.from([header, ...rows].join('\n')),
    });
  await continueToColumns(page);
  await page.getByRole('button', { name: 'Confirm columns' }).click();
  await page.getByRole('button', { name: 'Run analysis' }).click();
  await expect(page.getByText('Saved on this device.')).toBeVisible();
}

test('Movement compares two analyses and exports movers (S10, journey 4)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Upload orders' }).click();
  await analyse(page, 'shop-spring.csv', spring);

  await page.getByRole('button', { name: 'Movement' }).click();
  await expect(page.getByText('Movement needs two analyses')).toBeVisible();
  await page.getByRole('button', { name: 'Back to grid' }).click();

  await page.reload();
  await page.getByRole('button', { name: 'Open shop-spring' }).click();
  await page.getByRole('button', { name: 'Upload new export' }).click();
  await analyse(page, 'shop-autumn.csv', autumn);

  await page.getByRole('button', { name: 'Movement' }).click();
  await expect(page.getByText(/1 is new, 1 is not in the later analysis\./)).toBeVisible();
  const table = page.getByRole('table', { name: 'Customers who moved' });
  await expect(table.getByRole('row').nth(1)).toBeVisible();

  const firstFlow = table.getByRole('row').nth(1);
  const count = Number(await firstFlow.locator('td').nth(2).innerText());
  const download = page.waitForEvent('download');
  await firstFlow.getByRole('button').click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^movers-.+-to-.+\.csv$/);
  const lines = (await readFile(await file.path(), 'utf8')).trimEnd().split('\r\n');
  expect(lines).toHaveLength(count + 1);
  await expect(
    page.getByRole('status').filter({ hasText: file.suggestedFilename() }),
  ).toBeVisible();
});
