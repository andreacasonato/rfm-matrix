// The segment map: which segment each of the 125 R × F × M score combinations belongs to.
import type { CustomerScore, Score } from './index';
import type { ScoredCustomer } from './score';
import { segmentTexts } from './segment-texts';

export type Segment = {
  id: string;
  name: string;
  description: string;
  suggestedAction: string;
  sortOrder: number;
};

/** `cells[cellIndex(r, f, m)]` is the segment ID for that combination of scores. */
export type SegmentMap = { segments: Segment[]; cells: string[] };

export type ValidationResult = { ok: boolean; problems: string[] };

const scores = [1, 2, 3, 4, 5] as const;

export const cellIndex = (r: Score, f: Score, m: Score) => (r - 1) * 25 + (f - 1) * 5 + (m - 1);

export const segmentFor = (map: SegmentMap, r: Score, f: Score, m: Score) =>
  map.cells[cellIndex(r, f, m)] ?? '';

const segments: Segment[] = [
  ['champions', 'Champions'],
  ['loyal-customers', 'Loyal customers'],
  ['potential-loyalists', 'Potential loyalists'],
  ['new-customers', 'New customers'],
  ['promising', 'Promising'],
  ['need-attention', 'Need attention'],
  ['about-to-sleep', 'About to sleep'],
  ['at-risk', 'At risk'],
  ['cant-lose-them', "Can't lose them"],
  ['hibernating', 'Hibernating'],
  ['lost', 'Lost'],
].map(([id = '', name = ''], sortOrder) => ({
  id,
  name,
  description: segmentTexts[id]?.description ?? '',
  suggestedAction: segmentTexts[id]?.suggestedAction ?? '',
  sortOrder,
}));

// SCHEMA.md "Default segment map": rows R5 to R1, columns F1 to F5. Every M score shares a cell.
const byRecencyAndFrequency: Record<Score, string[]> = {
  5: ['new-customers', 'potential-loyalists', 'loyal-customers', 'champions', 'champions'],
  4: ['promising', 'potential-loyalists', 'loyal-customers', 'loyal-customers', 'loyal-customers'],
  3: ['about-to-sleep', 'about-to-sleep', 'need-attention', 'loyal-customers', 'loyal-customers'],
  2: ['about-to-sleep', 'about-to-sleep', 'at-risk', 'at-risk', 'cant-lose-them'],
  1: ['lost', 'hibernating', 'at-risk', 'at-risk', 'cant-lose-them'],
};

export const defaultSegmentMap: SegmentMap = {
  segments,
  cells: scores.flatMap((r) =>
    scores.flatMap((f) => scores.map(() => byRecencyAndFrequency[r][f - 1] ?? '')),
  ),
};

export function validateMap(map: SegmentMap): ValidationResult {
  const problems: string[] = [];
  const ids = new Set<string>();
  for (const segment of map.segments) {
    if (ids.has(segment.id)) problems.push(`Segment "${segment.id}" is listed twice.`);
    ids.add(segment.id);
  }
  if (map.cells.length !== 125) {
    problems.push(`The map has ${map.cells.length} cells; it needs exactly 125.`);
    return { ok: false, problems };
  }
  for (const r of scores) {
    for (const f of scores) {
      for (const m of scores) {
        const id = segmentFor(map, r, f, m);
        const cell = `R${r} F${f} M${m}`;
        if (!id) problems.push(`${cell} has no segment.`);
        else if (!ids.has(id)) problems.push(`${cell} points to an unknown segment "${id}".`);
      }
    }
  }
  return { ok: problems.length === 0, problems };
}

export function applySegments(customers: ScoredCustomer[], map: SegmentMap): CustomerScore[] {
  const validation = validateMap(map);
  if (!validation.ok) throw new Error(validation.problems.join(' '));
  return customers.map((c) => ({ ...c, segmentId: segmentFor(map, c.r, c.f, c.m) }));
}
