import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Score } from './index';
import type { ScoredCustomer } from './score';
import { applySegments, cellIndex, defaultSegmentMap, segmentFor, validateMap } from './segments';

const scores = [1, 2, 3, 4, 5] as const;
const name = (r: Score, f: Score, m: Score) => {
  const id = segmentFor(defaultSegmentMap, r, f, m);
  return defaultSegmentMap.segments.find((s) => s.id === id)?.name;
};

describe('defaultSegmentMap (SCHEMA.md)', () => {
  it('is valid: 125 cells, each pointing to one of 11 segments', () => {
    expect(defaultSegmentMap.cells).toHaveLength(125);
    expect(defaultSegmentMap.segments).toHaveLength(11);
    expect(validateMap(defaultSegmentMap)).toEqual({ ok: true, problems: [] });
  });

  it('matches the R × F table, copied across every M score', () => {
    const table: Record<number, string[]> = {
      5: ['New customers', 'Potential loyalists', 'Loyal customers', 'Champions', 'Champions'],
      4: [
        'Promising',
        'Potential loyalists',
        'Loyal customers',
        'Loyal customers',
        'Loyal customers',
      ],
      3: [
        'About to sleep',
        'About to sleep',
        'Need attention',
        'Loyal customers',
        'Loyal customers',
      ],
      2: ['About to sleep', 'About to sleep', 'At risk', 'At risk', "Can't lose them"],
      1: ['Lost', 'Hibernating', 'At risk', 'At risk', "Can't lose them"],
    };
    for (const r of scores) {
      for (const f of scores) {
        for (const m of scores) expect(name(r, f, m)).toBe(table[r]?.[f - 1]);
      }
    }
  });

  it('uses every segment at least once', () => {
    const used = new Set(defaultSegmentMap.cells);
    expect(used).toEqual(new Set(defaultSegmentMap.segments.map((s) => s.id)));
  });
});

describe('validateMap', () => {
  it('reports a missing cell', () => {
    const map = { ...defaultSegmentMap, cells: defaultSegmentMap.cells.slice(0, 124) };
    expect(validateMap(map).problems).toEqual(['The map has 124 cells; it needs exactly 125.']);
  });

  it('reports a cell with no segment or an unknown one, naming the scores', () => {
    const cells = [...defaultSegmentMap.cells];
    cells[cellIndex(1, 1, 1)] = '';
    cells[cellIndex(5, 5, 5)] = 'vip';
    expect(validateMap({ ...defaultSegmentMap, cells }).problems).toEqual([
      'R1 F1 M1 has no segment.',
      'R5 F5 M5 points to an unknown segment "vip".',
    ]);
  });

  it('reports a segment listed twice', () => {
    const { segments } = defaultSegmentMap;
    const map = { ...defaultSegmentMap, segments: [...segments, ...segments.slice(0, 1)] };
    expect(validateMap(map).problems).toEqual(['Segment "champions" is listed twice.']);
  });
});

describe('applySegments', () => {
  const customer = (key: string, r: Score, f: Score, m: Score): ScoredCustomer => ({
    customerKey: key,
    recencyDays: 1,
    frequency: 1,
    monetary: 1,
    r,
    f,
    m,
  });

  it('gives every customer exactly one segment from their scores (property)', () => {
    const score = fc.constantFrom(...scores);
    fc.assert(
      fc.property(fc.array(fc.tuple(score, score, score), { maxLength: 100 }), (triples) => {
        const customers = triples.map(([r, f, m], i) => customer(`c${i}`, r, f, m));
        const result = applySegments(customers, defaultSegmentMap);
        expect(result).toHaveLength(customers.length);
        result.forEach((c, i) => {
          expect(c.segmentId).toBe(segmentFor(defaultSegmentMap, c.r, c.f, c.m));
          expect(c.customerKey).toBe(customers[i]?.customerKey);
        });
      }),
    );
  });

  it('refuses an invalid map', () => {
    const map = { ...defaultSegmentMap, cells: [] };
    expect(() => applySegments([customer('a', 1, 1, 1)], map)).toThrow('needs exactly 125');
  });
});
