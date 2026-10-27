import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrast, contrastFailures, themes } from './contrast.ts';

describe('contrast (WCAG 2.2)', () => {
  it('computes the WCAG ratio', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBe(1);
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('reads the dark theme as the light one plus its overrides', () => {
    const css = `@theme { --color-a: #000000; --color-b: #ffffff; }
@media (prefers-color-scheme: dark) {}
:root[data-theme="dark"] { --color-a: #ffffff; }`;
    expect(themes(css)).toEqual({
      light: { a: '#000000', b: '#ffffff' },
      dark: { a: '#ffffff', b: '#ffffff' },
    });
  });
});

describe('the design tokens (M5 H3, WCAG AA)', () => {
  it('meet AA for every pairing the app uses, in both themes', () => {
    const css = readFileSync('packages/app/src/styles/tokens.css', 'utf8');
    expect(contrastFailures(css)).toEqual([]);
  });
});
