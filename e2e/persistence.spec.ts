import { expect, type Page, test } from '@playwright/test';

// Synthetic orders for 10 customers (S8 needs at least 5 to score).
const csv = [
  'Order,Customer ID,Email,Date,Total,Billing Name,Phone',
  ...Array.from({ length: 30 }, (_, i) => {
    const c = i % 10;
    const day = String((i % 27) + 1).padStart(2, '0');
    return `#${1000 + i},C${c},c${c}@example.test,2026-0${(i % 8) + 1}-${day},${10 + i}.00,Person ${c},+44 7700 9001${c}`;
  }),
].join('\n');

const customersOf = (page: Page, segment: string) =>
  page
    .locator(`tr[data-segment="${segment}"] td[data-customers]`)
    .getAttribute('data-customers')
    .then(Number);

async function analyseFile(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Upload orders' }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'my-shop.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv),
  });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Confirm columns' }).click();
  await page.getByRole('button', { name: 'Run analysis' }).click();
  await expect(page.getByText('Saved on this device.')).toBeVisible();
}

test.describe('saving on this device (S8)', () => {
  test('an analysis survives a reload and opens without the file', async ({ page }) => {
    await analyseFile(page);
    // The first segment in the list that has customers.
    const row = page.locator('tr[data-segment]:not(:has(td[data-customers="0"]))').first();
    const id = (await row.getAttribute('data-segment')) ?? '';
    const name = (await row.locator('th, td').first().innerText()).trim();
    const count = await customersOf(page, id);
    expect(count).toBeGreaterThan(0);

    await page.reload();
    const saved = page.getByRole('list', { name: 'Saved on this device' });
    await expect(saved).toContainText('my-shop');
    await expect(saved).toContainText('1 analysis · 10 customers');
    await page.getByRole('button', { name: 'Open my-shop' }).click();
    await expect.poll(() => customersOf(page, id)).toBe(count);

    // Segment detail and export work on the opened snapshot.
    await page.getByRole('button', { name: `Open ${name}`, exact: true }).click();
    await expect(page.getByText(`of ${count}`)).toBeVisible();
  });

  test('edited rules are kept with the project', async ({ page }) => {
    await analyseFile(page);
    await page.getByRole('button', { name: 'Edit segment rules' }).click();
    await page.getByRole('combobox', { name: 'Segment for R1 F1' }).selectOption('hibernating');
    await page.getByRole('button', { name: 'Save rules' }).click({ timeout: 2000 });
    await expect(
      page.getByText('Segment rules saved on this device', { exact: true }),
    ).toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: 'Open my-shop' }).click();
    await page.getByRole('button', { name: 'Edit segment rules' }).click();
    await expect(page.getByRole('combobox', { name: 'Segment for R1 F1' })).toHaveValue(
      'hibernating',
    );
  });

  test('the sample is never saved', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Try sample data' }).click();
    await expect(page.getByRole('button', { name: 'Edit segment rules' })).toBeVisible();
    await expect(page.getByText('Saved on this device.')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Upload orders' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Saved on this device' })).toHaveCount(0);
  });

  test('a new export goes into the saved project with its columns and rules (journey 4)', async ({
    page,
  }) => {
    await analyseFile(page);
    await page.getByRole('button', { name: 'Edit segment rules' }).click();
    await page.getByRole('combobox', { name: 'Segment for R1 F1' }).selectOption('hibernating');
    await page.getByRole('button', { name: 'Save rules' }).click({ timeout: 2000 });
    await expect(
      page.getByText('Segment rules saved on this device', { exact: true }),
    ).toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: 'Open my-shop' }).click();
    await page.getByRole('button', { name: 'Upload new export' }).click();
    // The same orders a month later, with the columns in another order.
    const [header = '', ...rows] = csv.split('\n');
    const order = [4, 3, 0, 2, 1, 5, 6];
    const reorder = (line: string) => {
      const cells = line.split(',');
      return order.map((i) => cells[i]).join(',');
    };
    const later = [reorder(header), ...rows.map(reorder)].join('\n');
    await page.locator('input[type=file]').setInputFiles({
      name: 'my-shop-november.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(later),
    });
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Columns matched by name from your last analysis')).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Order ID' })).toHaveValue('2');
    await expect(page.getByRole('combobox', { name: 'Amount', exact: true })).toHaveValue('0');
    await page.getByRole('button', { name: 'Confirm columns' }).click();
    await page.getByRole('button', { name: 'Run analysis' }).click();
    await expect(page.getByText('Saved on this device.')).toBeVisible();

    await page.getByRole('button', { name: 'Edit segment rules' }).click();
    await expect(page.getByRole('combobox', { name: 'Segment for R1 F1' })).toHaveValue(
      'hibernating',
    );
    await page.getByRole('button', { name: 'Back to grid' }).click();
    await page.getByRole('button', { name: 'Start over' }).click();
    await expect(page.getByRole('list', { name: 'Saved on this device' })).toContainText(
      '2 analyses',
    );
  });
});
