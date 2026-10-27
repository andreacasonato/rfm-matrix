import { expect, test } from '@playwright/test';

test('every error offers diagnostics without customer data (TRD §12)', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Upload orders' }).click();
  await page
    .locator('input[type=file]')
    .first()
    .setInputFiles({
      name: 'Ada Quill orders.xlsx',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]),
    });
  const alert = page.getByRole('alert');
  await alert.getByText('Diagnostics', { exact: true }).click();
  const text = await alert.getByTestId('diagnostics').innerText();
  expect(text).toMatch(/^RFM Matrix \d+\.\d+\.\d+, built \d{4}-\d{2}-\d{2}/);
  expect(text).toContain('Storage on this device: available');
  expect(text).toContain('Last error: This looks like an Excel file');
  expect(text).not.toContain('Ada Quill');
});
