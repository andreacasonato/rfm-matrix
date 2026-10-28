import { readFile } from 'node:fs/promises';
import { expect, type Page, test } from '@playwright/test';
import { continueToColumns } from './steps.ts';

async function exportSegment(page: Page, name: string) {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: `Export ${name}`, exact: true }).click();
  const file = await download;
  const text = await readFile(await file.path(), 'utf8');
  return { name: file.suggestedFilename(), text };
}

const rowsOf = (text: string) => text.replace(/^﻿/, '').trimEnd().split('\r\n');

test.describe('segment detail and export (S6)', () => {
  test('opens Champions from the sample and exports exactly its customers', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Try sample data' }).click();
    const count = await page
      .locator('tr[data-segment="champions"] td[data-customers]')
      .getAttribute('data-customers');
    await page.getByRole('button', { name: 'Open Champions', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Champions' })).toBeVisible();
    await expect(page.getByText('Reward them without discounts')).toBeVisible();
    await expect(page.getByText(`of ${count}`)).toBeVisible();

    const { name, text } = await exportSegment(page, 'Champions');
    expect(name).toMatch(/^champions-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(text.startsWith('﻿')).toBe(true);
    const rows = rowsOf(text);
    expect(rows[0]).toBe('Customer ID,Email,Recency (days),Orders,Spend,R,F,M,Segment');
    expect(rows).toHaveLength(Number(count) + 1);
    await expect(page.getByRole('status')).toContainText(`${name} · ${count} customers`);

    await page.getByRole('button', { name: 'Back to grid' }).click();
    await expect(
      page.getByRole('table', { name: 'Customers by recency and frequency' }),
    ).toBeVisible();
  });

  test('a heatmap cell opens its segment', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Try sample data' }).click();
    await page.getByRole('button', { name: 'Open Lost, R1 F1' }).click();
    await expect(page.getByRole('heading', { name: 'Lost' })).toBeVisible();
  });

  test('formula text from a hostile file is made inert in the export (ADR-0014)', async ({
    page,
  }) => {
    const hostile = [
      'Customer ID,Order No,Date,Amount',
      '"=HYPERLINK(""http://x.example"",""click"")",A1,2026-04-01,10',
      '+cmd,A2,2026-04-02,10',
      '@SUM(1),A3,2026-04-03,10',
      '-2+3,A4,2026-04-04,10',
      'plain,A5,2026-04-05,10',
    ].join('\n');
    await page.goto('/');
    await page.getByRole('button', { name: 'Upload orders' }).click();
    await page.locator('input[type=file]').setInputFiles({
      name: 'hostile.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(hostile),
    });
    await continueToColumns(page);
    await page.getByRole('button', { name: 'Confirm columns' }).click();
    await page.getByRole('button', { name: 'Run analysis' }).click();
    await expect(page.locator('output[data-status=done]')).toBeAttached();

    // Each customer has one order on a different day; open whichever segments exist.
    const exported: string[] = [];
    for (const segment of await page.locator('tr[data-segment]').all()) {
      if ((await segment.locator('td[data-customers]').getAttribute('data-customers')) === '0')
        continue;
      const name = (await segment.locator('th').innerText()).trim();
      await page.getByRole('button', { name: `Open ${name}`, exact: true }).click();
      exported.push(...rowsOf((await exportSegment(page, name)).text).slice(1));
      await page.getByRole('button', { name: 'Back to grid' }).click();
    }
    const ids = exported.map((line) => line.split(/,(?=\d)/)[0]);
    expect(ids.sort()).toEqual(
      [
        '"\'=HYPERLINK(""http://x.example"",""click"")"',
        "'+cmd",
        "'-2+3",
        "'@SUM(1)",
        'plain',
      ].sort(),
    );
  });
});
