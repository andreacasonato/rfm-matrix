import { gzipSync } from 'node:zlib';
import { expect, type Page, test } from '@playwright/test';

const csv = [
  'Order,Customer ID,Email,Date,Total',
  ...Array.from({ length: 24 }, (_, i) => {
    const c = i % 8;
    return `#${i},C${c},c${c}@example.test,2026-0${(i % 9) + 1}-0${(i % 8) + 1},${12 + i}.40`;
  }),
].join('\n');

const segmentCounts = (page: Page) =>
  page
    .locator('tr[data-segment] td[data-customers]')
    .evaluateAll((cells) => cells.map((cell) => cell.getAttribute('data-customers')));

test.describe('project files (S9, story 9)', () => {
  test('a saved project file reopens after Delete all data, grid and all', async ({ page }) => {
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
    const before = await segmentCounts(page);

    await page.getByRole('button', { name: 'Start over' }).click();
    await page.getByRole('button', { name: 'Project and data' }).click();
    await expect(page.getByText("The file will contain your customers' emails")).toBeVisible();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Save project file' }).click();
    const saved = await download;
    expect(saved.suggestedFilename()).toBe('my-shop.rfmproject');
    const path = await saved.path();

    await page.getByRole('button', { name: 'Delete all data' }).click();
    await page.getByLabel('Type DELETE to confirm').fill('DELETE');
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('All data on this device was deleted.')).toBeVisible();

    await page.locator('input[type=file][accept=".rfmproject"]').setInputFiles(path);
    await expect(page.getByRole('heading', { name: 'my-shop' })).toBeVisible();
    await expect.poll(() => segmentCounts(page)).toEqual(before);
    await page.getByRole('button', { name: 'Start over' }).click();
    await expect(page.getByRole('list', { name: 'Saved on this device' })).toContainText('my-shop');
  });

  test('a hostile project file is refused and shown as text only', async ({ page }) => {
    await page.goto('/');
    const evil = {
      format: 'rfm-matrix-project',
      schemaVersion: 1,
      project: { name: '<img src=x onerror="window.hacked=1">', cells: ['<script>'] },
      snapshots: 'lots',
    };
    await page.locator('input[type=file][accept=".rfmproject"]').setInputFiles({
      name: 'evil.rfmproject',
      mimeType: 'application/octet-stream',
      buffer: gzipSync(JSON.stringify(evil)),
    });
    const alert = page.getByRole('alert');
    await expect(alert).toContainText('evil.rfmproject cannot be opened');
    await expect(alert).toContainText('snapshots must be a list.');
    expect(await page.evaluate(() => (window as unknown as { hacked?: number }).hacked)).toBe(
      undefined,
    );
    await expect(page.getByRole('list', { name: 'Saved on this device' })).toHaveCount(0);
  });
});
