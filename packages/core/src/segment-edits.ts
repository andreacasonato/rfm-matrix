// Edits to the segment map (PRD story 6). Each returns a new map, so the editor can undo by
// keeping the previous one, and every result still covers all 125 cells exactly once.
import type { Score } from './index';
import { cellIndex, type SegmentMap, segmentFor } from './segments';

/** One R × F × M cell, or with `m: 'all'` the five cells of an R × F square. */
export type CellTarget = { r: Score; f: Score; m: Score | 'all' };

const scores = [1, 2, 3, 4, 5] as const;

export function setCell(map: SegmentMap, target: CellTarget, segmentId: string): SegmentMap {
  if (!map.segments.some((s) => s.id === segmentId)) {
    throw new Error(`The map has no segment "${segmentId}".`);
  }
  const cells = [...map.cells];
  const layers = target.m === 'all' ? scores : [target.m];
  for (const m of layers) cells[cellIndex(target.r, target.f, m)] = segmentId;
  return { ...map, cells };
}

/** The R × F square's segment when all five M cells agree, else null. */
export function rfSegment(map: SegmentMap, r: Score, f: Score): string | null {
  const first = segmentFor(map, r, f, 1);
  return scores.every((m) => segmentFor(map, r, f, m) === first) ? first : null;
}

export const sameForEveryM = (map: SegmentMap) =>
  scores.every((r) => scores.every((f) => rfSegment(map, r, f) !== null));

/** Makes every M layer a copy of layer `m`. */
export function copyLayer(map: SegmentMap, m: Score): SegmentMap {
  return scores.reduce(
    (next, r) =>
      scores.reduce((acc, f) => setCell(acc, { r, f, m: 'all' }, segmentFor(map, r, f, m)), next),
    map,
  );
}

export const describeCell = ({ r, f, m }: CellTarget) =>
  m === 'all' ? `R${r} F${f}` : `R${r} F${f} M${m}`;
