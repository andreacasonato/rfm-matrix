// Shared e2e steps. The first upload in a fresh browser asks three questions (S11); tests about
// other steps skip them here, and e2e/onboarding.spec.ts tests the questions themselves.
import type { Page } from '@playwright/test';

/** From the upload preview to Map columns. */
export async function continueToColumns(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Continue' }).click();
  const skip = page.getByRole('button', { name: 'Skip questions' });
  await skip
    .or(page.getByRole('button', { name: 'Confirm columns' }))
    .first()
    .waitFor();
  if (await skip.isVisible()) await skip.click();
}
