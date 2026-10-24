import { resolve } from 'node:path';
import { expect, type Page, test } from '@playwright/test';

// The bundled sample: 2,000 synthetic rows, 598 customers.
const samplePath = resolve('packages/app/public/sample-orders.csv');

function watchOtherOrigins(page: Page, baseURL: string | undefined) {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).origin !== new URL(baseURL ?? '').origin) urls.push(request.url());
  });
  return urls;
}

async function upload(
  page: Page,
  file: string | { name: string; mimeType: string; buffer: Buffer },
) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Upload orders' }).click();
  await page.locator('input[type=file]').setInputFiles(file);
}

test.describe('upload and preview (S1)', () => {
  test('previews a CSV, then runs the analysis on it', async ({ page, baseURL }) => {
    const otherOrigins = watchOtherOrigins(page, baseURL);
    await upload(page, samplePath);

    await expect(page.getByText('sample-orders.csv')).toBeVisible();
    await expect(page.getByText('2,000 rows, 28 columns')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(20);
    await expect(page.getByLabel('Separator')).toHaveValue(',');
    await expect(page.getByLabel('Text encoding')).toHaveValue('utf-8');

    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Run analysis' }).click();
    await expect(page.locator('td[data-total-customers]')).toHaveAttribute(
      'data-total-customers',
      '598',
    );
    expect(otherOrigins).toEqual([]);
  });

  test('re-reads the file when the separator is changed', async ({ page }) => {
    await upload(page, samplePath);
    await expect(page.getByText('2,000 rows, 28 columns')).toBeVisible();
    await page.getByLabel('Separator').selectOption(';');
    await expect(page.getByText(/rows, 1 columns/)).toBeVisible();
  });

  test('explains how to save an Excel file as CSV', async ({ page }) => {
    const xlsx = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
    await upload(page, { name: 'orders.xlsx', mimeType: 'application/octet-stream', buffer: xlsx });
    await expect(page.getByRole('alert')).toContainText('This looks like an Excel file');
    await page.getByRole('button', { name: 'Choose another file' }).click();
    await expect(page.getByTestId('drop-zone')).toBeVisible();
  });

  test('refuses a binary file with a clear message', async ({ page }) => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    await upload(page, { name: 'photo.csv', mimeType: 'text/csv', buffer: png });
    await expect(page.getByRole('alert')).toContainText('This is not a text file');
  });
});
