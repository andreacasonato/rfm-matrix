import { expect, test } from '@playwright/test';

// The sample's dates follow the computer's clock (sample-dates.ts): analysed today, with the
// same customers in each segment as the file's own dates give.
const countsWithFileDates = { champions: 19, 'about-to-sleep': 180, lost: 85, 'at-risk': 20 };

for (const today of ['2027-03-15T09:30:00', '2026-12-31T23:30:00']) {
  test(`the sample is analysed on today's date (${today})`, async ({ page }) => {
    await page.clock.setFixedTime(new Date(today));
    await page.goto('/');
    await page.getByRole('button', { name: 'Try sample data' }).click();
    await expect(page.locator('output[data-status=done]')).toBeVisible();

    const expected = new Date(today).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    await expect(page.getByRole('list', { name: 'Summary' })).toContainText(`Analysed${expected}`);

    for (const [segment, customers] of Object.entries(countsWithFileDates)) {
      await expect(
        page.locator(`tr[data-segment="${segment}"] td[data-customers]`),
      ).toHaveAttribute('data-customers', String(customers));
    }
  });
}
