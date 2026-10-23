import { describe, expect, it } from 'vitest';
import { checkBoundaries } from './boundaries.ts';

const file = (path: string, source: string) => ({ path, source });

describe('checkBoundaries', () => {
  it('accepts imports that follow ADR-0002', () => {
    const files = [
      file('packages/core/src/index.ts', "export * from './score';"),
      file('packages/core/src/score.test.ts', "import { it } from 'vitest';"),
      file('packages/io/src/index.ts', "import type { OrderRow } from '@rfm-matrix/core';"),
      file('packages/app/src/main.tsx', "import '@rfm-matrix/io'; import 'react';"),
    ];
    expect(checkBoundaries(files)).toEqual([]);
  });

  it.each([
    "import '@rfm-matrix/io';",
    "import '@rfm-matrix/app/worker';",
    "import { useState } from 'react';",
    "import { openDB } from 'idb';",
    "import { readFile } from 'node:fs';",
  ])('rejects core source importing a module: %s', (source) => {
    const violations = checkBoundaries([file('packages/core/src/score.ts', source)]);
    expect(violations).toHaveLength(1);
  });

  it('rejects core tests importing io, app, React or storage', () => {
    const files = [
      file('packages/core/src/a.test.ts', "import '@rfm-matrix/io';"),
      file('packages/core/src/b.test.ts', "import 'react-dom/client';"),
      file('packages/core/src/c.test.ts', "import 'idb';"),
    ];
    expect(checkBoundaries(files)).toHaveLength(3);
  });

  it('rejects io importing app', () => {
    const violations = checkBoundaries([
      file('packages/io/src/csv.ts', "import '@rfm-matrix/app';"),
    ]);
    expect(violations).toEqual([
      expect.objectContaining({ file: 'packages/io/src/csv.ts', specifier: '@rfm-matrix/app' }),
    ]);
  });

  it('rejects relative paths that leave the package', () => {
    const files = [
      file('packages/io/src/csv.ts', "import '../../app/src/main';"),
      file('packages/app/src/main.tsx', "import '../../core/src/index';"),
    ];
    expect(checkBoundaries(files)).toHaveLength(2);
  });

  it('accepts relative paths that stay inside the package', () => {
    const files = [file('packages/core/src/deep/a.ts', "import '../b'; import './c';")];
    expect(checkBoundaries(files)).toEqual([]);
  });
});
