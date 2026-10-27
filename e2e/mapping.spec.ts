import { expect, type Page, test } from '@playwright/test';
import { continueToColumns } from './steps.ts';

async function upload(page: Page, name: string, csv: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Upload orders' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name,
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await continueToColumns(page);
}

async function result(page: Page) {
  await page.getByRole('button', { name: 'Run analysis' }).click();
  const output = page.locator('output[data-status=done]');
  await expect(output).toBeVisible();
  return JSON.parse((await output.getAttribute('data-result')) ?? '{}');
}

const customers = ['a', 'b', 'c', 'd', 'e', 'f'];

test.describe('map columns (S2)', () => {
  test('maps a WooCommerce-style file with semicolons, decimal commas and day-first dates', async ({
    page,
  }) => {
    const rows = customers.map(
      (c, i) => `W${100 + i};2${i}/04/2026 10:00;1.2${i}4,50;${c}@example.test;${i + 1}`,
    );
    const csv = ['order_number;order_date;order_total;billing_email;customer_id', ...rows].join(
      '\n',
    );
    await upload(page, 'woo.csv', csv);

    await expect(page.getByLabel('Where is this file from?')).toHaveValue('woocommerce');
    await expect(page.getByLabel('Decimal separator')).toHaveValue(',');
    await expect(page.getByTestId('field-orderedAt')).toContainText('20 April 2026');
    await page.getByRole('button', { name: 'Confirm columns' }).click();

    const done = await result(page);
    expect(done).toMatchObject({ customers: 6, orders: 6, invalidRows: 0 });
    // 1.204,50 + 1.214,50 + … + 1.254,50
    expect(done.monetaryTotal).toBeCloseTo(6 * 1204.5 + 150, 2);
  });

  test('asks for the date order when the file cannot tell, then uses it', async ({ page }) => {
    const rows = customers.map((c, i) => `${c},A${i},03/0${i + 4}/2026,10.00`);
    await upload(page, 'dates.csv', ['Customer ID,Order No,Date,Amount', ...rows].join('\n'));

    const confirm = page.getByRole('button', { name: 'Confirm columns' });
    await expect(confirm).toBeDisabled();
    await page.getByLabel('4 March 2026').check();
    await confirm.click();
    expect((await result(page)).analysisDate).toBe('2026-03-10');
  });

  test('lets the user pick a column the guess missed', async ({ page }) => {
    const rows = customers.map((c, i) => `${c},A${i},2026-04-0${i + 1},9.00`);
    await upload(page, 'paid.csv', ['Customer ID,Order No,Date,Paid'].concat(rows).join('\n'));

    await expect(page.getByRole('alert')).toContainText('order amount');
    await page.getByLabel('Amount', { exact: true }).selectOption({ label: 'Paid' });
    await page.getByRole('button', { name: 'Confirm columns' }).click();
    expect(await result(page)).toMatchObject({ customers: 6, monetaryTotal: 54 });
  });

  test('adds up product lines when each row is a line', async ({ page }) => {
    const rows = customers.flatMap((c, i) => [
      `${c},L${i},2026-04-0${i + 1},5.00`,
      `${c},L${i},2026-04-0${i + 1},7.00`,
    ]);
    await upload(page, 'lines.csv', ['Customer ID,Order No,Date,Amount', ...rows].join('\n'));
    await page.getByLabel(/Each row is a product line/).check();
    await page.getByRole('button', { name: 'Confirm columns' }).click();
    expect(await result(page)).toMatchObject({ orders: 6, monetaryTotal: 72 });
  });
});
