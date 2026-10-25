import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { CustomerAggregate } from './orders';
import { NotEnoughCustomersError, score } from './score';

const day = (iso: string) => new Date(`${iso}T15:30:00Z`);
const customer = (key: string, last: string, orders: number, monetary: number) =>
  ({
    customerKey: key,
    orderCount: orders,
    monetary,
    firstOrderAt: day('2025-01-01'),
    lastOrderAt: day(last),
  }) satisfies CustomerAggregate;

const five = [
  customer('a', '2026-09-30', 1, 10),
  customer('b', '2026-09-20', 2, 20),
  customer('c', '2026-08-31', 3, 30),
  customer('d', '2026-06-30', 5, 40),
  customer('e', '2026-01-01', 6, 50),
];

describe('score', () => {
  it('defaults the analysis date to the UTC day after the latest order (ADR-0010)', () => {
    const result = score(five);
    expect(result.analysisDate).toEqual(new Date('2026-10-01T00:00:00Z'));
    expect(result.customers.map((c) => c.recencyDays)).toEqual([1, 11, 31, 93, 273]);
  });

  it('uses a given analysis date', () => {
    const result = score(five, { analysisDate: new Date('2026-10-11T08:00:00Z') });
    expect(result.customers[0]?.recencyDays).toBe(11);
  });

  it('scores 1 + the number of breakpoints strictly below the value, recency reversed', () => {
    const result = score(five);
    // Monetary 10..50: breakpoints 18, 26, 34, 42.
    expect(result.breakpoints.m).toEqual([18, 26, 34, 42]);
    expect(result.customers.map((c) => c.m)).toEqual([1, 2, 3, 4, 5]);
    expect(result.customers.map((c) => c.r)).toEqual([5, 4, 3, 2, 1]);
  });

  it('scores frequency with fixed breaks 1, 2, 3, 4–5, 6+ (TRD §8 rule 6)', () => {
    const orders = [1, 2, 3, 4, 5, 6, 40];
    const customers = orders.map((n, i) => customer(`c${i}`, '2026-09-01', n, 10));
    expect(score(customers).customers.map((c) => c.f)).toEqual([1, 2, 3, 4, 4, 5, 5]);
  });

  it('reports bin sizes that add up to the customer count', () => {
    const result = score(five);
    expect(result.binSizes.f).toEqual([1, 1, 1, 1, 1]);
    for (const bins of Object.values(result.binSizes)) {
      expect(bins.reduce((a, b) => a + b, 0)).toBe(5);
    }
  });

  it('blocks scoring with fewer than 5 customers (TRD §11)', () => {
    expect(() => score(five.slice(0, 4))).toThrow(NotEnoughCustomersError);
    expect(() => score(five.slice(0, 4))).toThrow('at least 5 customers');
  });

  const customers = fc
    .array(
      fc.record({
        days: fc.integer({ min: 0, max: 900 }),
        orders: fc.integer({ min: 1, max: 30 }),
        cents: fc.integer({ min: -5_000, max: 500_000 }),
      }),
      { minLength: 5, maxLength: 200 },
    )
    .map((rows) =>
      rows.map((row, i) => ({
        customerKey: `c${i}`,
        orderCount: row.orders,
        monetary: row.cents / 100,
        firstOrderAt: new Date(Date.UTC(2024, 0, 1)),
        lastOrderAt: new Date(Date.UTC(2024, 0, 1) + row.days * 86_400_000),
      })),
    );

  it('always gives whole scores from 1 to 5 (property)', () => {
    fc.assert(
      fc.property(customers, (list) => {
        for (const c of score(list).customers) {
          for (const s of [c.r, c.f, c.m]) expect([1, 2, 3, 4, 5]).toContain(s);
        }
      }),
    );
  });

  it('gives equal values equal scores and never ranks a better value lower (property)', () => {
    fc.assert(
      fc.property(customers, (list) => {
        const scored = score(list).customers;
        for (const a of scored) {
          for (const b of scored) {
            if (a.monetary === b.monetary) expect(a.m).toBe(b.m);
            if (a.monetary > b.monetary) expect(a.m).toBeGreaterThanOrEqual(b.m);
            if (a.recencyDays === b.recencyDays) expect(a.r).toBe(b.r);
            if (a.recencyDays < b.recencyDays) expect(a.r).toBeGreaterThanOrEqual(b.r);
            if (a.frequency === b.frequency) expect(a.f).toBe(b.f);
          }
        }
      }),
      { numRuns: 50 },
    );
  });
});
