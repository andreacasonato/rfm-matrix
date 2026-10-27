import { describe, expect, it } from 'vitest';
import { GzipReadError, gunzipText, gzipText } from './gzip-text';

describe('gzip text for project files (S9)', () => {
  it('round-trips text, including non-Latin letters', async () => {
    const text = JSON.stringify({ name: 'Zoë’s shop', note: '日本語' }).repeat(100);
    const file = await gzipText(text);
    expect(file.size).toBeLessThan(text.length);
    expect(await gunzipText(file)).toBe(text);
  });

  it('refuses a file that is not gzip', async () => {
    await expect(gunzipText(new Blob(['{"format":"x"}']))).rejects.toMatchObject({
      kind: 'not-gzip',
    });
  });

  it('refuses a cut-off file', async () => {
    const whole = await gzipText('x'.repeat(100_000) + Math.random());
    const cut = whole.slice(0, Math.floor(whole.size / 2));
    await expect(gunzipText(cut)).rejects.toBeInstanceOf(GzipReadError);
  });

  it('stops a small file that expands too far (a "zip bomb")', async () => {
    const bomb = await gzipText('0'.repeat(5_000_000));
    expect(bomb.size).toBeLessThan(50_000);
    await expect(gunzipText(bomb, { maxTextBytes: 1_000_000 })).rejects.toMatchObject({
      kind: 'too-large',
    });
  });

  it('refuses a file over the size limit before reading it', async () => {
    const file = await gzipText('x');
    await expect(gunzipText(file, { maxFileBytes: file.size - 1 })).rejects.toMatchObject({
      kind: 'too-large',
    });
  });
});
