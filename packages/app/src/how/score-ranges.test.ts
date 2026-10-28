import { describe, expect, it } from 'vitest';
import { binSizesFrom, scoreRanges } from './score-ranges';

describe('score ranges in words (How scores work)', () => {
  it('reads recency the reversed way: few days scores 5', () => {
    expect(scoreRanges('r', [12.5, 40, 90, 200])).toEqual([
      { score: 5, range: 'up to 12 days' },
      { score: 4, range: '13 to 40 days' },
      { score: 3, range: '41 to 90 days' },
      { score: 2, range: '91 to 200 days' },
      { score: 1, range: 'more than 200 days' },
    ]);
  });

  it('reads frequency with the default fixed cut points', () => {
    expect(scoreRanges('f', [1, 2, 3, 5]).map((r) => r.range)).toEqual([
      '1 order',
      '2 orders',
      '3 orders',
      '4 to 5 orders',
      'more than 5 orders',
    ]);
  });

  it('reads money with cents, and says when equal cut points leave a score empty', () => {
    expect(scoreRanges('m', [20, 20, 55.5, 120]).map((r) => r.range)).toEqual([
      'up to 20.00',
      'none: two cut points are equal',
      'over 20.00 up to 55.50',
      'over 55.50 up to 120.00',
      'over 120.00',
    ]);
  });

  it('adds up customers per score from the 125 cells', () => {
    const cells = Array.from({ length: 125 }, () => 1);
    expect(binSizesFrom(cells)).toEqual({
      r: [25, 25, 25, 25, 25],
      f: [25, 25, 25, 25, 25],
      m: [25, 25, 25, 25, 25],
    });
    const one = Array.from({ length: 125 }, (_, i) => (i === 0 ? 7 : 0));
    expect(binSizesFrom(one).r).toEqual([7, 0, 0, 0, 0]);
  });
});
