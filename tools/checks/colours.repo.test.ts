import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { colourViolations } from './colours.ts';

const appSrc = join(import.meta.dirname, '..', '..', 'packages', 'app', 'src');

describe('app UI colours (DESIGN.md)', () => {
  it('uses only theme tokens', () => {
    const files = readdirSync(appSrc, { recursive: true, encoding: 'utf8' })
      .filter((entry) => /\.(?:tsx?|css)$/.test(entry))
      .map((entry) => ({
        path: `packages/app/src/${entry.split('\\').join('/')}`,
        source: readFileSync(join(appSrc, entry), 'utf8'),
      }));
    expect(files.length).toBeGreaterThan(0);
    expect(colourViolations(files)).toEqual([]);
  });
});
