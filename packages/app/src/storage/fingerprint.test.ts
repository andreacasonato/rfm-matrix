import { describe, expect, it, vi } from 'vitest';
import { fileFingerprint } from './fingerprint';

describe('fileFingerprint (ADR-0019)', () => {
  it('is the same for the same bytes and differs when the end changes', async () => {
    const a = await fileFingerprint(new Blob(['id,n\n1,2\n']), 4);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await fileFingerprint(new Blob(['id,n\n1,2\n']), 4)).toBe(a);
    expect(await fileFingerprint(new Blob(['id,n\n1,3\n']), 4)).not.toBe(a);
  });

  it('reads only the first and last part of a large file', async () => {
    const file = new Blob(['x'.repeat(100)]);
    const slice = vi.spyOn(file, 'slice');
    await fileFingerprint(file, 10);
    expect(slice.mock.calls).toEqual([
      [0, 10],
      [90, 100],
    ]);
  });
});
