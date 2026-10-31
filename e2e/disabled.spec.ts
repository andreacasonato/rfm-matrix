import { expect, type Locator, test } from '@playwright/test';

// axe skips disabled controls, but a merchant still has to read "Save rules" to know it exists.
// Disabled buttons must keep 4.5:1 text, measured as rendered: opacity, then colours.
async function textContrast(button: Locator): Promise<number> {
  return button.evaluate((el) => {
    const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const lum = (c: number[]) => {
      const [r = 0, g = 0, b = 0] = c.map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    let opacity = 1;
    for (let n: Element | null = el; n; n = n.parentElement) {
      opacity *= Number(getComputedStyle(n).opacity);
    }
    let bg = rgb(getComputedStyle(el).backgroundColor);
    for (let n = el.parentElement; n && (bg[3] ?? 1) === 0; n = n.parentElement) {
      bg = rgb(getComputedStyle(n).backgroundColor);
    }
    const page = rgb(getComputedStyle(document.body).backgroundColor);
    const mix = (top: number[], bottom: number[], a: number) =>
      [0, 1, 2].map((i) => (top[i] ?? 0) * a + (bottom[i] ?? 0) * (1 - a));
    const behind = mix(bg, page, opacity);
    const fg = mix(rgb(getComputedStyle(el).color), behind, opacity);
    const [hi, lo] = [lum(fg), lum(behind)].sort((x, y) => y - x);
    return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
  });
}

for (const colorScheme of ['light', 'dark'] as const) {
  test(`disabled buttons stay readable, ${colorScheme} theme`, async ({ page }) => {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    await page.getByRole('button', { name: 'Try sample data' }).click();
    await page.getByRole('button', { name: 'Edit segment rules' }).click();
    for (const name of ['Save rules', 'Reset to default']) {
      const button = page.getByRole('button', { name });
      await expect(button).toBeDisabled();
      expect(await textContrast(button), name).toBeGreaterThanOrEqual(4.5);
    }
  });
}
