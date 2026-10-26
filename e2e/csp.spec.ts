import { expect, type Page, test } from '@playwright/test';

// The Content-Security-Policy (ADR-0015) is only in the production build, which these tests
// serve. Each test records every violation the page reports.
async function watchViolations(page: Page) {
  await page.addInitScript(() => {
    const seen: string[] = [];
    (window as unknown as { cspViolations: string[] }).cspViolations = seen;
    document.addEventListener('securitypolicyviolation', (event) => {
      seen.push(`${event.effectiveDirective} ${event.blockedURI}`);
    });
  });
}

const violations = (page: Page) =>
  page.evaluate(() => (window as unknown as { cspViolations: string[] }).cspViolations);

test.describe('Content-Security-Policy (M4)', () => {
  test.beforeEach(async ({ page }) => {
    await watchViolations(page);
  });

  test('the sample path to an export runs with no violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Try sample data' }).click();
    await page.getByRole('button', { name: 'Open Champions', exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export Champions', exact: true }).click();
    await download;
    expect(await violations(page)).toEqual([]);
  });

  test('the upload path to the grid runs with no violations', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Upload orders' }).click();
    await page.locator('input[type=file]').setInputFiles({
      name: 'orders.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(
        [
          'Customer ID,Order No,Date,Amount',
          'c1,#1,2026-03-01,100',
          'c2,#2,2026-04-01,50',
          'c3,#3,2026-05-01,20',
          'c4,#4,2026-05-02,80',
          'c5,#5,2026-05-03,10',
          'c6,#6,2026-05-04,60',
        ].join('\n'),
      ),
    });
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Confirm columns' }).click();
    await page.getByRole('button', { name: 'Run analysis' }).click();
    await expect(
      page.getByRole('table', { name: 'Customers by recency and frequency' }),
    ).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });

  test('a request to another host is blocked', async ({ page }) => {
    await page.goto('/');
    const outcome = await page.evaluate(() =>
      fetch('https://example.com/collect').then(
        () => 'sent',
        () => 'blocked',
      ),
    );
    expect(outcome).toBe('blocked');
    expect(await violations(page)).toContain('connect-src https://example.com/collect');
  });

  test('injected script and HTML do not run', async ({ page }) => {
    await page.goto('/');
    const outcome = await page.evaluate(async () => {
      const results: string[] = [];
      try {
        document.body.insertAdjacentHTML('beforeend', '<img src=x onerror="window.ran=1">');
        results.push('html inserted');
      } catch {
        results.push('html refused');
      }
      const script = document.createElement('script');
      try {
        script.textContent = 'window.ran = 1';
        document.body.append(script);
      } catch {
        results.push('script refused');
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      results.push((window as unknown as { ran?: number }).ran ? 'ran' : 'did not run');
      return results;
    });
    expect(outcome).toEqual(['html refused', 'script refused', 'did not run']);
  });
});
