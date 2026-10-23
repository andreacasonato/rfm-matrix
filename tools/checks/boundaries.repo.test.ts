import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkBoundaries } from './boundaries.ts';

const repoRoot = join(import.meta.dirname, '..', '..');
const sourcePattern = /\.(?:[cm]?[jt]s|[jt]sx)$/;

function packageSources() {
  const packagesDir = join(repoRoot, 'packages');
  return readdirSync(packagesDir).flatMap((name) => {
    const srcDir = join(packagesDir, name, 'src');
    return readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
      .filter((entry) => sourcePattern.test(entry))
      .map((entry) => {
        const absolute = join(srcDir, entry);
        const path = relative(repoRoot, absolute).split('\\').join('/');
        return { path, source: readFileSync(absolute, 'utf8') };
      });
  });
}

describe('repository import boundaries (ADR-0002)', () => {
  it('finds the source files of every package', () => {
    const packages = new Set(packageSources().map((f) => f.path.split('/')[1]));
    expect(packages).toEqual(new Set(['core', 'io', 'app']));
  });

  it('has no imports that cross a package boundary', () => {
    expect(checkBoundaries(packageSources())).toEqual([]);
  });
});
