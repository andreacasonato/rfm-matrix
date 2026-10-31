// Ordering for the segment list beside the grid. The default is the map's own order, best to
// worst; a column sorts highest first on the first click, then flips.
import type { SegmentsSummary } from '@rfm-matrix/core';

type Segment = SegmentsSummary['segments'][number];
export type SortKey = 'customers' | 'share' | 'revenue';
export type SegmentSort =
  | { key: 'segment' }
  | { key: SortKey; direction: 'ascending' | 'descending' };

const sortValue: Record<SortKey, (s: Segment) => number> = {
  customers: (s) => s.customers,
  share: (s) => s.customerShare,
  revenue: (s) => s.revenue,
};

/** A sorted copy; equal values keep the map's order in both directions. */
export function sortSegments(segments: Segment[], sort: SegmentSort): Segment[] {
  if (sort.key === 'segment') return [...segments];
  const value = sortValue[sort.key];
  const sign = sort.direction === 'ascending' ? 1 : -1;
  return segments
    .map((segment, index) => ({ segment, index }))
    .sort((a, b) => sign * (value(a.segment) - value(b.segment)) || a.index - b.index)
    .map(({ segment }) => segment);
}

export function nextSort(current: SegmentSort, clicked: SegmentSort['key']): SegmentSort {
  if (clicked === 'segment') return { key: 'segment' };
  if (current.key === clicked && current.direction === 'descending') {
    return { key: clicked, direction: 'ascending' };
  }
  return { key: clicked, direction: 'descending' };
}
