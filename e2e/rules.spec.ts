import { expect, type Page, test } from '@playwright/test';

const customersOf = (page: Page, segment: string) =>
  page
    .locator(`tr[data-segment="${segment}"] td[data-customers]`)
    .getAttribute('data-customers')
    .then(Number);

test.describe('segment rules (S7)', () => {
  test('an edit updates the counts, undoes, and once saved moves customers on the grid', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Try sample data' }).click();
    const champions = await customersOf(page, 'champions');
    const newCustomers = await customersOf(page, 'new-customers');
    expect(newCustomers).toBeGreaterThan(0);

    await page.getByRole('button', { name: 'Edit segment rules' }).click();
    const r5f1 = page.getByRole('combobox', { name: 'Segment for R5 F1' });
    await r5f1.selectOption('champions');
    await expect.poll(() => customersOf(page, 'champions')).toBe(champions + newCustomers);
    await page.getByRole('button', { name: 'Undo' }).click();
    await expect(r5f1).toHaveValue('new-customers');
    await expect.poll(() => customersOf(page, 'champions')).toBe(champions);

    await r5f1.selectOption('champions');
    // Regression: the undo bar's wrapper covered the page and blocked this click for 10 s.
    await page.getByRole('button', { name: 'Save rules' }).click({ timeout: 2000 });
    await expect(page.getByRole('button', { name: 'Open Champions, R5 F1' })).toBeVisible();
    expect(await customersOf(page, 'champions')).toBe(champions + newCustomers);
    expect(await customersOf(page, 'new-customers')).toBe(0);

    await page.getByRole('button', { name: 'Open Champions', exact: true }).click();
    await expect(page.getByText(`of ${champions + newCustomers}`)).toBeVisible();
  });

  test('Discard changes leaves the grid as it was', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Try sample data' }).click();
    const lost = await customersOf(page, 'lost');
    await page.getByRole('button', { name: 'Edit segment rules' }).click();
    await page.getByRole('combobox', { name: 'Segment for R1 F2' }).selectOption('lost');
    await page.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page.getByRole('button', { name: 'Edit segment rules' })).toBeVisible();
    expect(await customersOf(page, 'lost')).toBe(lost);
    await page.getByRole('button', { name: 'Open Lost', exact: true }).click();
    await expect(page.getByText(`of ${lost}`)).toBeVisible();
  });
});
