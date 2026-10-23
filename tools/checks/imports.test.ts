import { describe, expect, it } from 'vitest';
import { importSpecifiers } from './imports.ts';

describe('importSpecifiers', () => {
  it('finds static, type-only, side-effect and multi-line imports', () => {
    const source = `
      import a from 'a';
      import type { B } from "b";
      import 'c';
      import d, {
        e,
        type F,
      } from 'd';
      import * as g from 'g';
    `;
    expect(importSpecifiers(source)).toEqual(['a', 'b', 'c', 'd', 'g']);
  });

  it('finds re-exports, dynamic imports and require calls', () => {
    const source = `
      export * from './x';
      export * as y from './y';
      export { z } from './z';
      export type { W } from './w';
      const m = await import('m');
      const n = require("n");
    `;
    expect(importSpecifiers(source)).toEqual(['./x', './y', './z', './w', 'm', 'n']);
  });

  it('ignores local exports without a module specifier', () => {
    expect(importSpecifiers('export const a = 1; export { a as b };')).toEqual([]);
  });
});
