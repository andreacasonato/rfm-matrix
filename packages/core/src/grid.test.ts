import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { gridCells } from './grid';
import type { CustomerScore, Score } from './index';
import { cellIndex, defaultSegmentMap, segmentFor } from './segments';

const scores = [1, 2, 3, 4, 5] as const;
const customer = (r: Score, f: Score, m: Score, monetary: number): CustomerScore => ({
  customerKey: `${r}${f}${m}-${monetary}`,
  recencyDays: 1,
  frequency: 1,
  monetary,
  r,
  f,
  m,
  segmentId: segmentFor(defaultSegmentMap, r, f, m),
});

describe('gridCells (PRD story 5)', () => {
  it('returns the 25 R × F cells, R from 5 down to 1 and F from 1 up to 5', () => {
    const cells = gridCells([], defaultSegmentMap);
    expect(cells).toHaveLength(25);
    expect(cells.slice(0, 5).map((c) => [c.r, c.f])).toEqual([
      [5, 1],
      [5, 2],
      [5, 3],
      [5, 4],
      [5, 5],
    ]);
    expect(cells.at(-1)).toMatchObject({ r: 1, f: 5, customers: 0, revenue: 0 });
  });

  it('counts customers and revenue per cell across all monetary scores', () => {
    const cells = gridCells(
      [customer(5, 4, 1, 10), customer(5, 4, 5, 90), customer(1, 1, 3, 7)],
      defaultSegmentMap,
    );
    expect(cells.find((c) => c.r === 5 && c.f === 4)).toEqual({
      r: 5,
      f: 4,
      customers: 2,
      revenue: 100,
      segmentId: 'champions',
    });
    expect(cells.find((c) => c.r === 1 && c.f === 1)).toMatchObject({
      customers: 1,
      segmentId: 'lost',
    });
  });

  it('names each cell after the default map (SCHEMA.md)', () => {
    const cells = gridCells([], defaultSegmentMap);
    expect(cells.map((c) => c.segmentId).slice(0, 5)).toEqual([
      'new-customers',
      'potential-loyalists',
      'loyal-customers',
      'champions',
      'champions',
    ]);
  });

  it('marks a cell whose segment depends on M as mixed (null)', () => {
    const cells = [...defaultSegmentMap.cells];
    cells[cellIndex(3, 3, 5)] = 'champions';
    const grid = gridCells([], { ...defaultSegmentMap, cells });
    expect(grid.find((c) => c.r === 3 && c.f === 3)?.segmentId).toBeNull();
  });

  it('adds up to the scored customers and their revenue (property)', () => {
    const score = fc.constantFrom(...scores);
    fc.assert(
      fc.property(
        fc.array(fc.tuple(score, score, score, fc.integer({ min: -100, max: 10_000 })), {
          maxLength: 200,
        }),
        (rows) => {
          const customers = rows.map(([r, f, m, cents]) => customer(r, f, m, cents / 100));
          const cells = gridCells(customers, defaultSegmentMap);
          expect(cells.reduce((n, c) => n + c.customers, 0)).toBe(customers.length);
          const revenue = customers.reduce((n, c) => n + c.monetary, 0);
          expect(cells.reduce((n, c) => n + c.revenue, 0)).toBeCloseTo(revenue, 6);
        },
      ),
    );
  });
});
