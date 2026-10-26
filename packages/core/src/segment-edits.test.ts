import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Score } from './index';
import { copyLayer, describeCell, rfSegment, sameForEveryM, setCell } from './segment-edits';
import { defaultSegmentMap, segmentFor, validateMap } from './segments';

const score = fc.constantFrom<Score>(1, 2, 3, 4, 5);
const segmentId = fc.constantFrom(...defaultSegmentMap.segments.map((s) => s.id));

describe('setCell (S7)', () => {
  it('changes one R × F × M cell and nothing else', () => {
    const map = setCell(defaultSegmentMap, { r: 5, f: 1, m: 3 }, 'champions');
    expect(segmentFor(map, 5, 1, 3)).toBe('champions');
    expect(segmentFor(map, 5, 1, 2)).toBe('new-customers');
    expect(map.cells.filter((id, i) => id !== defaultSegmentMap.cells[i])).toHaveLength(1);
    expect(segmentFor(defaultSegmentMap, 5, 1, 3)).toBe('new-customers');
  });

  it('changes all five M cells of an R × F cell at once', () => {
    const map = setCell(defaultSegmentMap, { r: 1, f: 1, m: 'all' }, 'hibernating');
    for (const m of [1, 2, 3, 4, 5] as const) expect(segmentFor(map, 1, 1, m)).toBe('hibernating');
    expect(rfSegment(map, 1, 1)).toBe('hibernating');
  });

  it('refuses a segment the map does not have', () => {
    expect(() => setCell(defaultSegmentMap, { r: 1, f: 1, m: 'all' }, 'vip')).toThrow(/vip/);
  });

  it('keeps every map valid: 125 cells, each in exactly one known segment (property)', () => {
    const edit = fc.record({ r: score, f: score, m: fc.oneof(score, fc.constant('all' as const)) });
    fc.assert(
      fc.property(fc.array(fc.tuple(edit, segmentId), { maxLength: 60 }), (edits) => {
        const map = edits.reduce((m, [target, id]) => setCell(m, target, id), defaultSegmentMap);
        expect(map.cells).toHaveLength(125);
        expect(validateMap(map)).toEqual({ ok: true, problems: [] });
      }),
    );
  });
});

describe('the same rules for every M', () => {
  it('holds for the default map, and stops holding after a single-M edit', () => {
    expect(sameForEveryM(defaultSegmentMap)).toBe(true);
    const map = setCell(defaultSegmentMap, { r: 3, f: 3, m: 5 }, 'champions');
    expect(sameForEveryM(map)).toBe(false);
    expect(rfSegment(map, 3, 3)).toBeNull();
  });

  it('copies one M layer to all five', () => {
    const map = setCell(defaultSegmentMap, { r: 3, f: 3, m: 5 }, 'champions');
    const copied = copyLayer(map, 5);
    expect(sameForEveryM(copied)).toBe(true);
    expect(rfSegment(copied, 3, 3)).toBe('champions');
  });
});

describe('describeCell', () => {
  it('names a cell the way the grid labels it', () => {
    expect(describeCell({ r: 5, f: 1, m: 'all' })).toBe('R5 F1');
    expect(describeCell({ r: 2, f: 4, m: 3 })).toBe('R2 F4 M3');
  });
});
