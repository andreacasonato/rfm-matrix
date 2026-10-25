import { describe, expect, it } from 'vitest';
import { colourViolations } from './colours.ts';

const file = (path: string, source: string) => ({ path, source });

describe('colourViolations', () => {
  it.each([
    ['a hex colour in a style', 'packages/app/src/A.tsx', "<p style={{ color: '#F2541B' }} />"],
    ['a short hex colour in CSS', 'packages/app/src/a.css', '.x { color: #fff; }'],
    ['an rgb() colour', 'packages/app/src/a.css', '.x { color: rgb(0 0 0); }'],
    ['an hsl() colour', 'packages/app/src/A.tsx', "const c = 'hsl(10 50% 50%)';"],
    ['a default palette class', 'packages/app/src/A.tsx', '<p className="bg-orange-500" />'],
    ['a default palette class with a variant', 'packages/app/src/A.tsx', '"dark:text-slate-200"'],
    ['white or black classes', 'packages/app/src/A.tsx', '<p className="text-white" />'],
  ])('rejects %s', (_label, path, source) => {
    expect(colourViolations([file(path, source)])).toHaveLength(1);
  });

  it('accepts token classes and allows raw values in the tokens file only', () => {
    const files = [
      file(
        'packages/app/src/A.tsx',
        '<p className="bg-surface text-text-primary border-border" />',
      ),
      file('packages/app/src/styles/tokens.css', '--color-canvas: #eef0f2;'),
    ];
    expect(colourViolations(files)).toEqual([]);
  });

  it('ignores test files, where text like order "#1001" is data, not colour', () => {
    expect(colourViolations([file('packages/app/src/A.test.tsx', "'#1001'")])).toEqual([]);
  });

  it('reports the file, line and match', () => {
    const violations = colourViolations([
      file('packages/app/src/a.css', 'a {}\nb { color: #abc; }'),
    ]);
    expect(violations).toEqual([{ file: 'packages/app/src/a.css', line: 2, match: '#abc' }]);
  });
});
