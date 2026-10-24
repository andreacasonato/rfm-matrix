import { describe, expect, it } from 'vitest';
import { percentileInc, quintileBreakpoints } from './percentile';

// Expected values computed by hand with Excel's PERCENTILE.INC formula (ADR-0010).
describe('percentileInc', () => {
  it.each([
    [[1, 2, 3, 4], 0.2, 1.6],
    [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.4, 4.6],
    [[1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.8, 8.2],
    [[5], 0.6, 5],
    [[3, 3, 3, 9], 0.6, 3],
    [[-10, 0, 10], 0.5, 0],
  ])('PERCENTILE.INC(%j, %d) = %d', (values, p, expected) => {
    expect(percentileInc(Float64Array.from(values), p)).toBeCloseTo(expected, 10);
  });
});

describe('quintileBreakpoints', () => {
  it('returns the 20th, 40th, 60th and 80th percentiles of unsorted values', () => {
    expect(quintileBreakpoints([10, 1, 9, 2, 8, 3, 7, 4, 6, 5])).toEqual([
      expect.closeTo(2.8, 10),
      expect.closeTo(4.6, 10),
      expect.closeTo(6.4, 10),
      expect.closeTo(8.2, 10),
    ]);
  });
});
