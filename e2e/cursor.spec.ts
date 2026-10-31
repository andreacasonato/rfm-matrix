import { expect, type Locator, test } from '@playwright/test';

// Everything clickable shows the hand cursor, and disabled buttons show "not allowed".
// Tailwind 4's base styles leave buttons on the default arrow, so this is set once in index.css.
const cursorOf = (locator: Locator) => locator.evaluate((el) => getComputedStyle(el).cursor);

test('clickable things show the hand cursor, disabled ones do not', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => cursorOf(page.getByRole('link', { name: /Feedback/ }))).toBe('pointer');
  await page.getByRole('button', { name: 'Try sample data' }).click();
  const listed = page.locator('tr[data-segment="champions"]').getByRole('button');
  await listed.waitFor();
  expect(await cursorOf(listed)).toBe('pointer');
  expect(await cursorOf(page.getByRole('button', { name: 'Open Champions' }).first())).toBe(
    'pointer',
  );

  for (const name of ['How scores work', 'Edit segment rules', 'Start over']) {
    expect(await cursorOf(page.getByRole('button', { name, exact: true })), name).toBe('pointer');
  }

  await page.getByRole('button', { name: 'Edit segment rules' }).click();
  expect(await cursorOf(page.getByRole('button', { name: 'Save rules' }))).toBe('not-allowed');
  expect(await cursorOf(page.getByRole('combobox').first())).toBe('pointer');
  const checkbox = page.getByRole('checkbox', { name: 'Same rules for every M score' });
  expect(await cursorOf(checkbox)).toBe('pointer');
  expect(await cursorOf(page.getByText('Same rules for every M score'))).toBe('pointer');
});
