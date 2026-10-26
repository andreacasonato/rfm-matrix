import {
  applySegments,
  type CustomerScore,
  defaultSegmentMap,
  type Score,
  setCell,
  summariseSegments,
} from '@rfm-matrix/core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { buildCustomerTable, segmentRows } from './customer-table';
import { cellCustomers, resegment } from './resegment';

const score = fc.constantFrom<Score>(1, 2, 3, 4, 5);
const customers = fc.array(
  fc.record({ r: score, f: score, m: score, monetary: fc.integer({ min: -500, max: 5000 }) }),
  { maxLength: 200 },
);
const toScores = (list: { r: Score; f: Score; m: Score; monetary: number }[]) =>
  applySegments(
    list.map((c, i) => ({ ...c, customerKey: `c${i}`, recencyDays: i, frequency: c.f })),
    defaultSegmentMap,
  );

describe('resegment (S7: the grid after a rules edit)', () => {
  it('gives the same summary as scoring again with the edited map (property)', () => {
    const edit = fc.tuple(
      score,
      score,
      fc.constantFrom(...defaultSegmentMap.segments.map((s) => s.id)),
    );
    fc.assert(
      fc.property(customers, fc.array(edit, { maxLength: 10 }), (list, edits) => {
        const scores = toScores(list);
        const map = edits.reduce(
          (m, [r, f, id]) => setCell(m, { r, f, m: r }, id),
          defaultSegmentMap,
        );
        const table = buildCustomerTable(scores, false);
        const expected = summariseSegments(applySegments(scores, map), map);
        expect(resegment(table, map)).toEqual(expected);
      }),
    );
  });

  it('moves customers, so segment pages and exports follow the new rules', () => {
    const scores = toScores([{ r: 5, f: 1, m: 1, monetary: 10 }]);
    const table = buildCustomerTable(scores, false);
    expect(segmentRows(table, 'new-customers')).toEqual([0]);
    resegment(table, setCell(defaultSegmentMap, { r: 5, f: 1, m: 'all' }, 'champions'));
    expect(segmentRows(table, 'new-customers')).toEqual([]);
    expect(segmentRows(table, 'champions')).toEqual([0]);
  });

  it('counts customers in each of the 125 cells', () => {
    const scores = toScores([
      { r: 1, f: 1, m: 1, monetary: 1 },
      { r: 1, f: 1, m: 1, monetary: 2 },
      { r: 5, f: 5, m: 5, monetary: 3 },
    ]);
    const counts = cellCustomers(buildCustomerTable(scores, false));
    expect(counts).toHaveLength(125);
    expect(counts[0]).toBe(2);
    expect(counts[124]).toBe(1);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(3);
  });

  it('re-segments 300,000 customers well within the 100 ms grid target (TRD §3)', () => {
    const scores: CustomerScore[] = toScores(
      Array.from({ length: 300_000 }, (_, i) => ({
        r: ((i % 5) + 1) as Score,
        f: ((Math.floor(i / 5) % 5) + 1) as Score,
        m: ((Math.floor(i / 25) % 5) + 1) as Score,
        monetary: i % 997,
      })),
    );
    const table = buildCustomerTable(scores, false);
    const map = setCell(defaultSegmentMap, { r: 3, f: 3, m: 'all' }, 'champions');
    const times = Array.from({ length: 5 }, () => {
      const started = performance.now();
      resegment(table, map);
      return performance.now() - started;
    }).sort((a, b) => a - b);
    expect(times[2]).toBeLessThan(100);
  });
});
