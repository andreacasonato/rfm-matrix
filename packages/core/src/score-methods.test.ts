import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { putler15 } from './fixtures/putler-15';
import type { CustomerAggregate } from './orders';
import { type DimensionMethod, defaultScoring, score, validateBreaks } from './score';

const dayMs = 86_400_000;
const analysisDate = new Date('2026-01-01T00:00:00Z');
const customer = (key: string, recency: number, orders: number, monetary: number) =>
  ({
    customerKey: key,
    orderCount: orders,
    monetary,
    firstOrderAt: new Date(0),
    lastOrderAt: new Date(analysisDate.getTime() - recency * dayMs + 12 * 3_600_000),
  }) satisfies CustomerAggregate;

const putlerCustomers = putler15.map(([id, r, f, m]) => customer(String(id), r, f, m));
const quintiles = { method: 'quantile' } as const;

describe('Putler golden fixture (TRD §14)', () => {
  it('matches all 45 published scores when F is scored by quintiles, as in the article', () => {
    const result = score(putlerCustomers, {
      analysisDate,
      scoring: { ...defaultScoring, f: quintiles },
    });
    expect(result.customers.map((c) => [Number(c.customerKey), c.r, c.f, c.m])).toEqual(
      putler15.map(([id, , , , r, f, m]) => [id, r, f, m]),
    );
  });

  it('differs only on customers 1, 5 and 11 with the default fixed F breaks (ADR-0004 rule 6)', () => {
    const result = score(putlerCustomers, { analysisDate });
    const differ = result.customers
      .filter((c, i) => c.f !== putler15[i]?.[5])
      .map((c) => [Number(c.customerKey), c.frequency, c.f]);
    expect(differ).toEqual([
      [1, 6, 5],
      [5, 4, 4],
      [11, 8, 5],
    ]);
  });
});

describe('fixed cut points (TRD §8 rule 7)', () => {
  it('reverses recency: up to 30 days 5, 31–60 4, 61–90 3, 91–180 2, more 1', () => {
    const days = [0, 30, 31, 60, 61, 90, 91, 180, 181, 900];
    const customers = days.map((d, i) => customer(`c${i}`, d, 1, 10));
    const result = score(customers, {
      analysisDate,
      scoring: { ...defaultScoring, r: { method: 'fixed', breaks: [30, 60, 90, 180] } },
    });
    expect(result.customers.map((c) => c.r)).toEqual([5, 5, 4, 4, 3, 3, 2, 2, 1, 1]);
    expect(result.breakpoints.r).toEqual([30, 60, 90, 180]);
  });

  it('scores monetary against the given amounts, ties equal', () => {
    const amounts = [50, 100, 100, 101, 500, 999, 1000, 5000];
    const customers = amounts.map((m, i) => customer(`c${i}`, 1, 1, m));
    const result = score(customers, {
      analysisDate,
      scoring: { ...defaultScoring, m: { method: 'fixed', breaks: [100, 200, 500, 1000] } },
    });
    expect(result.customers.map((c) => c.m)).toEqual([1, 1, 1, 2, 3, 4, 4, 5]);
  });

  it('refuses unusable cut points', () => {
    const bad: DimensionMethod = { method: 'fixed', breaks: [30, 20, 90, 180] };
    expect(() =>
      score(putlerCustomers, { analysisDate, scoring: { ...defaultScoring, r: bad } }),
    ).toThrow('larger than the one before');
  });
});

describe('validateBreaks', () => {
  it.each([
    ['r', [30, 60, 90, 180], []],
    ['m', [-10, 0, 99.5, 1000], []],
    ['f', [1, 2, 3], ['Enter 4 cut points.']],
    ['r', [30, 30, 90, 180], ['Each cut point must be larger than the one before.']],
    ['f', [1, 2.5, 3, 5], ['Use whole numbers of orders.']],
    ['r', [-1, 60, 90, 180], ['Use whole numbers of days, from 0 up.']],
    ['m', [1, 2, Number.NaN, 4], ['Every cut point must be a number.']],
  ] as const)('%s %j → %j', (dimension, breaks, problems) => {
    expect(validateBreaks(dimension, [...breaks])).toEqual(problems);
  });
});

describe('fixed cut points (properties)', () => {
  const breaks = fc
    .uniqueArray(fc.integer({ min: 0, max: 400 }), { minLength: 4, maxLength: 4 })
    .map((b) => [...b].sort((a, c) => a - c) as [number, number, number, number]);
  const values = fc.array(fc.integer({ min: 0, max: 500 }), { minLength: 5, maxLength: 60 });

  it('gives scores 1–5, equal values equal scores, and never ranks a better value lower', () => {
    fc.assert(
      fc.property(breaks, values, (b, recency) => {
        const customers = recency.map((d, i) => customer(`c${i}`, d, 1 + (d % 7), d));
        const fixed = { method: 'fixed', breaks: b } as const;
        const scored = score(customers, {
          analysisDate,
          scoring: { r: fixed, f: fixed, m: fixed },
        }).customers;
        for (const a of scored) {
          for (const c of scored) {
            expect([1, 2, 3, 4, 5]).toContain(a.r);
            if (a.recencyDays === c.recencyDays) expect(a.r).toBe(c.r);
            if (a.recencyDays < c.recencyDays) expect(a.r).toBeGreaterThanOrEqual(c.r);
            if (a.monetary > c.monetary) expect(a.m).toBeGreaterThanOrEqual(c.m);
          }
        }
      }),
      { numRuns: 50 },
    );
  });
});
