import { describe, expect, it } from 'vitest';
import type { CustomerAggregate } from './orders';
import type { Breakpoints } from './percentile';
import { breakpointsFor, type ScoringMethods, score, scoreFor } from './score';

describe('scoreFor (TRD §8 for one value)', () => {
  it('scores 1 plus the cut points strictly below the value', () => {
    const breaks: Breakpoints = [60, 120, 210, 412];
    expect([0, 60, 60.01, 120, 211, 412, 413].map((v) => scoreFor('m', v, breaks))).toEqual([
      1, 1, 2, 2, 4, 4, 5,
    ]);
  });

  it('reverses recency, so the most recent customers score 5', () => {
    const breaks: Breakpoints = [30, 60, 90, 180];
    expect([0, 30, 31, 90, 180, 181].map((d) => scoreFor('r', d, breaks))).toEqual([
      5, 5, 4, 3, 2, 1,
    ]);
  });
});

describe('breakpointsFor', () => {
  it('uses quintiles of the values, or the fixed cut points as given', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const quintiles = breakpointsFor('m', { method: 'quantile' }, values);
    [2.8, 4.6, 6.4, 8.2].forEach((b, i) => {
      expect(quintiles[i]).toBeCloseTo(b, 9);
    });
    expect(breakpointsFor('f', { method: 'fixed', breaks: [1, 2, 3, 5] }, values)).toEqual([
      1, 2, 3, 5,
    ]);
  });

  it('refuses cut points that validateBreaks rejects', () => {
    expect(() => breakpointsFor('r', { method: 'fixed', breaks: [30, 20, 90, 180] }, [])).toThrow(
      'larger than the one before',
    );
    expect(() =>
      breakpointsFor('m', { method: 'fixed', breaks: [1, 2, 3, Number.POSITIVE_INFINITY] }, []),
    ).toThrow('must be a number');
  });

  it('gives the same scores as score() for a whole set of customers', () => {
    const day = 86_400_000;
    const customers: CustomerAggregate[] = Array.from({ length: 30 }, (_, i) => ({
      customerKey: `c${i}`,
      orderCount: (i % 7) + 1,
      monetary: (i * 37) % 500,
      firstOrderAt: new Date(0),
      lastOrderAt: new Date(Date.UTC(2026, 0, 1) - ((i * 11) % 300) * day),
    }));
    const f: Breakpoints = [1, 2, 3, 5];
    const m: Breakpoints = [50, 100, 200, 400];
    const scoring: ScoringMethods = {
      r: { method: 'quantile' },
      f: { method: 'fixed', breaks: f },
      m: { method: 'fixed', breaks: m },
    };
    const result = score(customers, { scoring });
    const r = breakpointsFor(
      'r',
      scoring.r,
      result.customers.map((c) => c.recencyDays),
    );
    for (const c of result.customers) {
      expect(scoreFor('r', c.recencyDays, r)).toBe(c.r);
      expect(scoreFor('f', c.frequency, f)).toBe(c.f);
      expect(scoreFor('m', c.monetary, m)).toBe(c.m);
    }
  });
});
