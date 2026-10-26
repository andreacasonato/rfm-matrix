import { describe, expect, it, vi } from 'vitest';
import { appScriptUrl, installTrustedTypes } from './trusted-types';

const base = 'https://shop.example/rfm-matrix/index.html';

describe('appScriptUrl', () => {
  it("accepts the app's own scripts, as written and as resolved", () => {
    expect(appScriptUrl('./assets/analysis.worker-x.js', base)).toBe(
      './assets/analysis.worker-x.js',
    );
    const resolved = 'https://shop.example/rfm-matrix/assets/analysis.worker-x.js';
    expect(appScriptUrl(resolved, base)).toBe(resolved);
  });

  it('refuses other hosts, other folders on the same host and inline URLs', () => {
    expect(appScriptUrl('https://cdn.example/x.js', base)).toBeNull();
    expect(appScriptUrl('/other-site/x.js', base)).toBeNull();
    expect(appScriptUrl('../x.js', base)).toBeNull();
    expect(appScriptUrl('data:text/javascript,alert(1)', base)).toBeNull();
    expect(appScriptUrl('blob:https://shop.example/1234', base)).toBeNull();
    expect(appScriptUrl('javascript:alert(1)', base)).toBeNull();
  });
});

describe('installTrustedTypes', () => {
  it('does nothing in a browser without Trusted Types', () => {
    expect(() => installTrustedTypes(undefined, base)).not.toThrow();
  });

  it('adds a default policy that only creates script URLs', () => {
    const createPolicy = vi.fn();
    installTrustedTypes({ createPolicy }, base);
    expect(createPolicy).toHaveBeenCalledTimes(1);
    const [name, rules] = createPolicy.mock.calls[0] ?? [];
    expect(name).toBe('default');
    expect(Object.keys(rules)).toEqual(['createScriptURL']);
    expect(rules.createScriptURL('https://cdn.example/x.js')).toBeNull();
  });
});
