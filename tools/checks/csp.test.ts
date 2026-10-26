import { describe, expect, it } from 'vitest';
import { contentSecurityPolicy } from '../../packages/app/csp.ts';
import { cspProblems } from './csp.ts';

const meta = (policy: string) => `<meta http-equiv="Content-Security-Policy" content="${policy}">`;
const page = (head: string) => `<!doctype html><html><head>${head}</head><body></body></html>`;
const script = '<script type="module" src="./assets/index.js"></script>';

describe('cspProblems', () => {
  it('accepts the approved policy before every script and stylesheet', () => {
    const html = page(`${meta(contentSecurityPolicy)}<meta charset="UTF-8">${script}`);
    expect(cspProblems(html, contentSecurityPolicy)).toEqual([]);
  });

  it('reads the policy as a browser does, with HTML entities decoded', () => {
    const encoded = contentSecurityPolicy.replaceAll("'", '&#39;');
    expect(cspProblems(page(`${meta(encoded)}${script}`), contentSecurityPolicy)).toEqual([]);
  });

  it('reports a page without the policy', () => {
    expect(cspProblems(page(script), contentSecurityPolicy)).toEqual([
      'No Content-Security-Policy meta tag in <head>.',
    ]);
  });

  it('reports a policy that differs from the approved one', () => {
    const html = page(`${meta("default-src 'self'")}${script}`);
    expect(cspProblems(html, contentSecurityPolicy)).toEqual([
      'The Content-Security-Policy differs from the approved one (ADR-0015).',
    ]);
  });

  it('reports a policy that comes after a script, which it would not cover', () => {
    const html = page(`${script}${meta(contentSecurityPolicy)}`);
    expect(cspProblems(html, contentSecurityPolicy)).toEqual([
      'The Content-Security-Policy must come before every script, stylesheet and style.',
    ]);
  });

  it('reports a second policy, which browsers would combine with the first', () => {
    const html = page(`${meta(contentSecurityPolicy)}${meta(contentSecurityPolicy)}${script}`);
    expect(cspProblems(html, contentSecurityPolicy)).toEqual([
      'There is more than one Content-Security-Policy meta tag.',
    ]);
  });
});

describe('the approved policy', () => {
  it('blocks other hosts, inline code and HTML injection', () => {
    expect(contentSecurityPolicy).toContain("default-src 'none'");
    expect(contentSecurityPolicy).toContain("connect-src 'self'");
    expect(contentSecurityPolicy).toContain("require-trusted-types-for 'script'");
    expect(contentSecurityPolicy).not.toMatch(/unsafe-|https?:|\*|data:|blob:/);
  });
});
