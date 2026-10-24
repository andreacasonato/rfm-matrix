import { describe, expect, it } from 'vitest';
import type { CustomerScore } from './index';
import { defaultSegmentMap } from './segments';
import { summariseSegments } from './summary';

const scored = (segmentId: string, monetary: number): CustomerScore => ({
  customerKey: `${segmentId}-${monetary}`,
  recencyDays: 1,
  frequency: 1,
  monetary,
  r: 1,
  f: 1,
  m: 1,
  segmentId,
});

describe('summariseSegments', () => {
  const customers = [scored('champions', 60), scored('champions', 20), scored('lost', 20)];
  const summary = summariseSegments(customers, defaultSegmentMap);

  it('lists every segment in map order, including empty ones', () => {
    expect(summary.segments.map((s) => s.id)).toEqual(defaultSegmentMap.segments.map((s) => s.id));
    expect(summary.segments.find((s) => s.id === 'promising')).toMatchObject({
      customers: 0,
      revenue: 0,
      customerShare: 0,
    });
  });

  it('counts customers and revenue with shares of the totals', () => {
    expect(summary.segments[0]).toEqual({
      id: 'champions',
      name: 'Champions',
      customers: 2,
      revenue: 80,
      customerShare: 2 / 3,
      revenueShare: 0.8,
    });
    expect(summary.totals).toEqual({ customers: 3, revenue: 100 });
  });

  it('has totals equal to the sum of segments (PRD story 5)', () => {
    const sum = summary.segments.reduce((n, s) => n + s.customers, 0);
    expect(sum).toBe(summary.totals.customers);
  });

  it('reports zero shares instead of dividing by zero', () => {
    const empty = summariseSegments([scored('lost', 0)], defaultSegmentMap);
    expect(empty.segments.find((s) => s.id === 'lost')?.revenueShare).toBe(0);
  });
});
