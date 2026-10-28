// Movement between two snapshots (PRD story 8, TRD §5): how many customers went from each
// segment to each other one. Both snapshots are read with the same rules, so a rules edit is
// never shown as movement; customers in only one snapshot get their own "segment".
import type { Score } from './index';
import { type SegmentMap, segmentFor } from './segments';

/** A snapshot's customers, column by column. */
export type SnapshotScores = { customerKey: string[]; r: Score[]; f: Score[]; m: Score[] };

export const notInEarlier = 'not-in-earlier';
export const notInLater = 'not-in-later';

export type Flow = { from: string; to: string; customers: number };
export type Movement = {
  /** Customers who changed segment, or are in only one snapshot; biggest first. */
  flows: Flow[];
  totals: { stayed: number; moved: number; newCustomers: number; gone: number };
};

function segments(s: SnapshotScores, map: SegmentMap): Map<string, string> {
  const out = new Map<string, string>();
  s.customerKey.forEach((key, i) => {
    out.set(key, segmentFor(map, s.r[i] as Score, s.f[i] as Score, s.m[i] as Score));
  });
  return out;
}

export function compareSnapshots(
  before: SnapshotScores,
  after: SnapshotScores,
  map: SegmentMap,
): Movement {
  const earlier = segments(before, map);
  const later = segments(after, map);
  const counts = new Map<string, Flow>();
  const totals = { stayed: 0, moved: 0, newCustomers: 0, gone: 0 };
  const add = (from: string, to: string) => {
    const key = `${from}\u0000${to}`;
    const flow = counts.get(key) ?? { from, to, customers: 0 };
    flow.customers++;
    counts.set(key, flow);
  };
  for (const [key, from] of earlier) {
    const to = later.get(key);
    if (to === undefined) {
      totals.gone++;
      add(from, notInLater);
    } else if (to === from) totals.stayed++;
    else {
      totals.moved++;
      add(from, to);
    }
  }
  for (const [key, to] of later) {
    if (!earlier.has(key)) {
      totals.newCustomers++;
      add(notInEarlier, to);
    }
  }
  // Ties keep the segments' own order, with the two outside rows last.
  const order = new Map(map.segments.map((s) => [s.id, s.sortOrder]));
  const rank = (id: string) => order.get(id) ?? (id === notInLater ? 1000 : 1001);
  const flows = [...counts.values()].sort(
    (a, b) => b.customers - a.customers || rank(a.from) - rank(b.from) || rank(a.to) - rank(b.to),
  );
  return { flows, totals };
}
