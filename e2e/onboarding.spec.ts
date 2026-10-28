import { expect, type Page, test } from '@playwright/test';

const csv = [
  'Order ID,Customer ID,Order date,Amount',
  ...Array.from(
    { length: 12 },
    (_, i) => `#${i},C${i % 6},2026-0${(i % 8) + 1}-1${i % 9},${9 + i}.50`,
  ),
].join('\n');

async function upload(page: Page) {
  await page.getByRole('button', { name: 'Upload orders' }).click();
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'shop.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
  await page.getByRole('button', { name: 'Continue' }).click();
}

test.describe('first-upload questions (S11, APP_FLOW "Onboarding")', () => {
  test('the answers fill in the next steps, and are asked only once', async ({ page }) => {
    await page.goto('/');
    await upload(page);
    await expect(page.getByRole('heading', { name: 'Three quick questions' })).toBeVisible();
    await page.getByLabel('Other shop or spreadsheet').check();
    await page.getByLabel(/Each row is a product line/).check();
    await page.getByLabel('Another date').check();
    await page.getByLabel('Analysis date').fill('2026-08-31');
    await page.getByRole('button', { name: 'Continue' }).click();

    await expect(page.getByLabel('Where is this file from?')).toHaveValue('other');
    await expect(page.getByLabel(/Each row is a product line/)).toBeChecked();
    await page.getByRole('button', { name: 'Confirm columns' }).click();
    await expect(page.getByLabel('Another date')).toBeChecked();
    await expect(page.getByLabel('Analysis date')).toHaveValue('2026-08-31');
    await page.getByRole('button', { name: 'Run analysis' }).click();
    await expect(page.getByText('Saved on this device.')).toBeVisible();

    await page.reload();
    await upload(page);
    await expect(page.getByRole('heading', { name: 'Map columns' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Three quick questions' })).toHaveCount(0);
  });

  test('skipping also stops the questions from coming back', async ({ page }) => {
    await page.goto('/');
    await upload(page);
    await page.getByRole('button', { name: 'Skip questions' }).click();
    await expect(page.getByRole('heading', { name: 'Map columns' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await page.getByRole('button', { name: 'Back' }).click();
    await upload(page);
    await expect(page.getByRole('heading', { name: 'Map columns' })).toBeVisible();
  });

  test('the sample reaches the grid in under a minute (PRD §11)', async ({ page }) => {
    await page.goto('/');
    const started = Date.now();
    await page.getByRole('button', { name: 'Try sample data' }).click();
    await expect(
      page.getByRole('table', { name: 'Customers by recency and frequency' }),
    ).toBeVisible();
    expect(Date.now() - started).toBeLessThan(60_000);
  });
});
