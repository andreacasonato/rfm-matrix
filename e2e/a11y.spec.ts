import { AxeBuilder } from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

// WCAG 2.2 AA on every screen, in both themes (M5 H3). axe checks contrast as rendered, labels,
// roles and structure; colour pairs are also checked from the tokens in tools/checks/contrast.ts.
const csv = [
  'Order,Customer ID,Email,Date,Total,Status',
  ...Array.from({ length: 24 }, (_, i) => {
    const c = i % 8;
    return `#${i},C${c},c${c}@example.test,2026-0${(i % 9) + 1}-1${i % 9},${10 + i}.00,${i % 7 ? 'paid' : 'cancelled'}`;
  }),
].join('\n');

// axe files contrast it cannot measure under "incomplete", not under violations; those fail
// too, unless listed. The dialog sits over a translucent backdrop, which axe cannot see through;
// its panel is opaque surface, and its text pairs are checked from the tokens.
const unmeasurable = new Set(['Delete all data dialog']);

async function expectAccessible(page: Page, screen: string) {
  const { violations, incomplete } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  const unknownContrast = unmeasurable.has(screen)
    ? []
    : incomplete.filter((v) => v.id === 'color-contrast');
  const found = [...violations, ...unknownContrast].map(
    (v) => `${screen}: ${v.id} (${v.nodes.length}) ${v.help}`,
  );
  expect(found).toEqual([]);
}

for (const colorScheme of ['light', 'dark'] as const) {
  test.describe(`accessibility, ${colorScheme} theme`, () => {
    test.use({ colorScheme });

    test('the upload journey, screen by screen', async ({ page }) => {
      await page.goto('/');
      await expectAccessible(page, 'Start');
      await page.getByRole('button', { name: 'Upload orders' }).click();
      await expectAccessible(page, 'Upload');
      await page
        .locator('input[type=file]')
        .first()
        .setInputFiles({
          name: 'shop.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(csv),
        });
      await expect(page.getByRole('button', { name: 'Continue' })).toBeVisible();
      await expectAccessible(page, 'Preview');
      await page.getByRole('button', { name: 'Continue' }).click();
      await expectAccessible(page, 'Questions');
      await page.getByRole('button', { name: 'Continue' }).click();
      await expectAccessible(page, 'Map columns');
      await page.getByRole('button', { name: 'Confirm columns' }).click();
      await expect(page.getByRole('button', { name: 'Run analysis' })).toBeVisible();
      await expectAccessible(page, 'Clean and settings');
      await page.getByRole('button', { name: 'Run analysis' }).click();
      await expect(page.getByText('Saved on this device.')).toBeVisible();
      // The heatmap's one animation would be measured mid-fill; wait for it to end.
      await page.waitForTimeout(1200);
      await expectAccessible(page, 'Grid');
      await page.getByRole('button', { name: 'How scores work' }).click();
      await expectAccessible(page, 'How scores work');
      await page.getByRole('button', { name: 'Back to grid' }).click();
      await page.getByRole('button', { name: 'Score thresholds' }).click();
      await page
        .getByRole('radiogroup', { name: 'Monetary: who decides' })
        .getByLabel(/Set my own/)
        .check();
      await expectAccessible(page, 'Score thresholds');
      await page.getByRole('button', { name: 'Back to grid' }).click();
      await page.getByRole('button', { name: 'Edit segment rules' }).click();
      await expectAccessible(page, 'Segment rules');
      await page.getByRole('button', { name: 'Back to grid' }).click();
      await page.getByRole('button', { name: 'Movement' }).click();
      await expectAccessible(page, 'Movement, one analysis');
      await page.getByRole('button', { name: 'Back to grid' }).click();
      await page
        .getByRole('button', { name: /^Open / })
        .first()
        .click();
      await expect(page.getByRole('button', { name: /^Export / })).toBeVisible();
      await expectAccessible(page, 'Segment detail');
      await page.getByRole('button', { name: 'Start over' }).click();
      await page.getByRole('button', { name: 'Project and data' }).click();
      await expectAccessible(page, 'Project and data');
      await page.getByRole('button', { name: 'Delete all data' }).click();
      await expectAccessible(page, 'Delete all data dialog');
    });

    test('notices and the sample', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Upload orders' }).click();
      await page
        .locator('input[type=file]')
        .first()
        .setInputFiles({
          name: 'book.xlsx',
          mimeType: 'application/octet-stream',
          buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]),
        });
      await expect(page.getByRole('alert')).toBeVisible();
      await expectAccessible(page, 'Unreadable file error');
      await page.goto('/');
      await page.getByRole('button', { name: 'Try sample data' }).click();
      await expect(page.getByRole('button', { name: 'Edit segment rules' })).toBeVisible();
      await page.waitForTimeout(1200);
      await expectAccessible(page, 'Sample grid');
    });
  });
}
