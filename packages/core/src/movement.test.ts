import { describe, expect, it } from 'vitest';
import type { Score } from './index';
import { compareSnapshots, notInEarlier, notInLater, type SnapshotScores } from './movement';
import { setCell } from './segment-edits';
import { defaultSegmentMap } from './segments';

const scores = (rows: [string, Score, Score, Score][]): SnapshotScores => ({
  customerKey: rows.map(([k]) => k),
  r: rows.map(([, r]) => r),
  f: rows.map(([, , f]) => f),
  m: rows.map(([, , , m]) => m),
});

// Hand-built: segments read from SCHEMA.md's default table (R × F, every M the same).
const before = scores([
  ['A', 5, 5, 3], // Champions
  ['B', 5, 1, 1], // New customers
  ['C', 1, 1, 2], // Lost
  ['D', 3, 3, 4], // Need attention
  ['E', 2, 3, 5], // At risk
]);
const after = scores([
  ['A', 4, 5, 3], // Loyal customers
  ['B', 5, 2, 1], // Potential loyalists
  ['C', 1, 1, 2], // Lost (stayed)
  ['D', 3, 3, 5], // Need attention (stayed; M changed)
  ['F', 5, 1, 2], // New customers, not in the earlier analysis
]);

describe('compareSnapshots (S10, PRD story 8)', () => {
  it('counts customers moving from each segment to each other, matching the hand count', () => {
    const movement = compareSnapshots(before, after, defaultSegmentMap);
    expect(movement.totals).toEqual({ stayed: 2, moved: 2, newCustomers: 1, gone: 1 });
    expect(movement.flows).toEqual([
      { from: 'champions', to: 'loyal-customers', customers: 1 },
      { from: 'new-customers', to: 'potential-loyalists', customers: 1 },
      { from: 'at-risk', to: notInLater, customers: 1 },
      { from: notInEarlier, to: 'new-customers', customers: 1 },
    ]);
  });

  it('puts the biggest flows first', () => {
    const many = scores([
      ['A', 5, 5, 1],
      ['B', 5, 5, 1],
      ['C', 5, 1, 1],
    ]);
    const later = scores([
      ['A', 1, 1, 1],
      ['B', 1, 1, 1],
      ['C', 1, 1, 1],
    ]);
    expect(compareSnapshots(many, later, defaultSegmentMap).flows).toEqual([
      { from: 'champions', to: 'lost', customers: 2 },
      { from: 'new-customers', to: 'lost', customers: 1 },
    ]);
  });

  it('uses the given rules for both analyses, so rule edits are not movement', () => {
    const map = setCell(defaultSegmentMap, { r: 4, f: 5, m: 'all' }, 'champions');
    const movement = compareSnapshots(before, after, map);
    expect(movement.flows.find((f) => f.from === 'champions')).toBeUndefined();
    expect(movement.totals.stayed).toBe(3);
  });

  it('accounts for every customer exactly once', () => {
    const { totals } = compareSnapshots(before, after, defaultSegmentMap);
    const inBoth = totals.stayed + totals.moved;
    expect(inBoth + totals.gone).toBe(before.customerKey.length);
    expect(inBoth + totals.newCustomers).toBe(after.customerKey.length);
  });
});
