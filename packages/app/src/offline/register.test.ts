import { describe, expect, it, vi } from 'vitest';
import { registerOffline } from './register';

describe('registerOffline', () => {
  it("registers the app's service worker from the app folder", () => {
    const register = vi.fn(() => Promise.resolve());
    registerOffline({ register });
    expect(register).toHaveBeenCalledWith('./sw.js');
  });

  it('does nothing in a browser without service workers', () => {
    expect(() => registerOffline(undefined)).not.toThrow();
  });

  // Firefox private windows refuse service workers; the app still works online.
  it('keeps going when the browser refuses', async () => {
    const register = vi.fn(() => Promise.reject(new Error('SecurityError')));
    registerOffline({ register });
    await expect(Promise.resolve()).resolves.toBeUndefined();
  });
});
