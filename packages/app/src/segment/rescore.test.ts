import {
  applySegments,
  type CustomerAggregate,
  defaultSegmentMap,
  gridCells,
  type ScoringMethods,
  score,
  summariseSegments,
} from '@rfm-matrix/core';
import { describe, expect, it } from 'vitest';
import { buildCustomerTable } from './customer-table';
import { rescore, scoreCounts } from './rescore';
import { cellCustomers } from './resegment';

const day = 86_400_000;
const aggregates: CustomerAggregate[] = Array.from({ length: 60 }, (_, i) => ({
  customerKey: `c${i}`,
  orderCount: (i % 9) + 1,
  monetary: (i * 53) % 700,
  firstOrderAt: new Date(0),
  lastOrderAt: new Date(Date.UTC(2026, 5, 1) - ((i * 17) % 400) * day),
}));
const analysisDate = new Date(Date.UTC(2026, 5, 2));

const tableScoredWith = (scoring: ScoringMethods) =>
  buildCustomerTable(
    applySegments(score(aggregates, { scoring, analysisDate }).customers, defaultSegmentMap),
    false,
  );

const quintiles: ScoringMethods = {
  r: { method: 'quantile' },
  f: { method: 'quantile' },
  m: { method: 'quantile' },
};
const ownThresholds: ScoringMethods = {
  r: { method: 'fixed', breaks: [30, 90, 180, 365] },
  f: { method: 'fixed', breaks: [1, 2, 4, 6] },
  m: { method: 'fixed', breaks: [100, 250, 400, 600] },
};

describe('rescore (U5: new thresholds without reading the file again)', () => {
  it('gives every customer the scores and segment a fresh analysis would', () => {
    const table = tableScoredWith(quintiles);
    const result = rescore(table, ownThresholds, defaultSegmentMap);
    const fresh = score(aggregates, { scoring: ownThresholds, analysisDate });
    const expected = applySegments(fresh.customers, defaultSegmentMap);
    expect(Array.from(table.r)).toEqual(fresh.customers.map((c) => c.r));
    expect(Array.from(table.f)).toEqual(fresh.customers.map((c) => c.f));
    expect(Array.from(table.m)).toEqual(fresh.customers.map((c) => c.m));
    expect(result.breakpoints).toEqual(fresh.breakpoints);
    expect(result.segments).toEqual(summariseSegments(expected, defaultSegmentMap));
    expect(result.grid).toEqual(gridCells(expected, defaultSegmentMap));
    expect(result.cellCustomers).toEqual(cellCustomers(tableScoredWith(ownThresholds)));
  });

  it('goes back to quintiles as well', () => {
    const table = tableScoredWith(ownThresholds);
    rescore(table, quintiles, defaultSegmentMap);
    expect(Array.from(table.m)).toEqual(Array.from(tableScoredWith(quintiles).m));
  });

  it('refuses unusable thresholds and leaves the scores as they were', () => {
    const table = tableScoredWith(quintiles);
    const before = Array.from(table.m);
    const bad: ScoringMethods = { ...quintiles, m: { method: 'fixed', breaks: [5, 4, 3, 2] } };
    expect(() => rescore(table, bad, defaultSegmentMap)).toThrow('larger than the one before');
    expect(Array.from(table.m)).toEqual(before);
  });
});

describe('scoreCounts', () => {
  it('counts the customers each score would hold, without changing any score', () => {
    const table = tableScoredWith(quintiles);
    const before = Array.from(table.m);
    const { counts, breakpoints } = scoreCounts(table, 'm', ownThresholds.m);
    const fresh = score(aggregates, { scoring: ownThresholds, analysisDate });
    expect(counts).toEqual(fresh.binSizes.m);
    expect(breakpoints).toEqual([100, 250, 400, 600]);
    expect(Array.from(table.m)).toEqual(before);
  });

  it('counts recency the right way round: score 5 is the most recent', () => {
    const table = tableScoredWith(quintiles);
    const { counts } = scoreCounts(table, 'r', ownThresholds.r);
    const within30 = Array.from(table.recencyDays).filter((d) => d <= 30).length;
    expect(counts[4]).toBe(within30);
  });
});
