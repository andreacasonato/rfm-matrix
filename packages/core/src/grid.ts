// The RFM grid: customers and revenue in each of the 25 recency × frequency cells
// (PRD story 5, DESIGN_BRIEF grid sketch). Monetary scores are added up within a cell.
import type { CustomerScore, Score } from './index';
import { rfSegment } from './segment-edits';
import type { SegmentMap } from './segments';

export type GridCell = {
  r: Score;
  f: Score;
  customers: number;
  revenue: number;
  /** The cell's segment, or null when the map gives different segments for different M. */
  segmentId: string | null;
};

const scores = [1, 2, 3, 4, 5] as const;
const position = (r: Score, f: Score) => (5 - r) * 5 + (f - 1);

/** Cells row by row: R from 5 (top) to 1, F from 1 (left) to 5. */
export function gridCells(customers: CustomerScore[], map: SegmentMap): GridCell[] {
  const cells: GridCell[] = [];
  for (const r of [...scores].reverse()) {
    for (const f of scores) {
      cells.push({ r, f, customers: 0, revenue: 0, segmentId: rfSegment(map, r, f) });
    }
  }
  for (const c of customers) {
    const cell = cells[position(c.r, c.f)];
    if (!cell) continue;
    cell.customers++;
    cell.revenue += c.monetary;
  }
  return cells;
}
