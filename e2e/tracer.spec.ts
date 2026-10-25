import { expect, test } from '@playwright/test';

// packages/app/public/sample-orders.csv: 2,000 synthetic rows, seed 42; 540 customers remain
// once the default cleaning leaves fully refunded orders out (ADR-0013).
const sampleCustomers = 540;

test.describe('tracer bullet (M2)', () => {
  test('Try sample data lists 11 segments whose counts add up, without leaving the origin', async ({
    page,
    baseURL,
  }) => {
    const otherOrigins: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== new URL(baseURL ?? '').origin) {
        otherOrigins.push(request.url());
      }
    });

    await page.goto('/');
    await page.getByRole('button', { name: 'Try sample data' }).click();
    await expect(page.locator('output[data-status=done]')).toBeVisible();

    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(11);
    const counts = await page
      .locator('td[data-customers]')
      .evaluateAll((cells) => cells.map((c) => Number(c.getAttribute('data-customers'))));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(sampleCustomers);
    await expect(page.locator('td[data-total-customers]')).toHaveAttribute(
      'data-total-customers',
      String(sampleCustomers),
    );
    await expect(page.getByText('PERCENTILE.INC')).toBeVisible();
    expect(otherOrigins).toEqual([]);
  });

  test('a file with fewer than 5 customers explains why it cannot be scored', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Upload orders' }).click();
    const csv = 'Name,Email,Created at,Total\n#1,a@example.test,2026-01-01T10:00:00Z,10.00\n';
    await page.locator('input[type=file]').setInputFiles({
      name: 'tiny.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Confirm columns' }).click();
    await page.getByRole('button', { name: 'Run analysis' }).click();
    await expect(page.getByRole('alert')).toContainText('at least 5 customers');
  });
});
