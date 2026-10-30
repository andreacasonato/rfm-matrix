import { describe, expect, it } from 'vitest';
import { releaseRefProblems } from './release-ref.ts';

const tag = (refName: string, onMain = true) => ({ refType: 'tag', refName, onMain });

describe('releaseRefProblems', () => {
  it('accepts a version tag on main', () => {
    expect(releaseRefProblems(tag('v0.1.0'))).toEqual([]);
    expect(releaseRefProblems(tag('v1.0.0'))).toEqual([]);
    expect(releaseRefProblems(tag('v12.3.45'))).toEqual([]);
  });

  it('refuses a branch, even main', () => {
    for (const refName of ['main', 'm6-release']) {
      expect(releaseRefProblems({ refType: 'branch', refName, onMain: true })).toEqual([
        `Deploys run only from a release tag, not the branch "${refName}" (ADR-0009).`,
      ]);
    }
  });

  it('refuses a tag that is not a full version', () => {
    for (const refName of ['v0.1', '0.1.0', 'v0.1.0-rc.1', 'v01.0.0', 'release', 'v0.1.0 ']) {
      expect(releaseRefProblems(tag(refName))).toEqual([
        `The tag "${refName}" is not a release version like v1.2.3 (ADR-0009).`,
      ]);
    }
  });

  it('refuses a version tag whose commit is not on main', () => {
    expect(releaseRefProblems(tag('v0.1.0', false))).toEqual([
      'The tag "v0.1.0" points at a commit that is not on main (ADR-0009).',
    ]);
  });

  it('reports every problem at once', () => {
    expect(releaseRefProblems(tag('v0.1', false))).toHaveLength(2);
  });

  it('refuses when GitHub gives no ref', () => {
    expect(releaseRefProblems({ refType: '', refName: '', onMain: false })).toContain(
      'Deploys run only from a release tag, not the ref "" (ADR-0009).',
    );
  });
});
