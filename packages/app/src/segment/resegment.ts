// Applies an edited segment map to the worker's customer table (S7): each customer's segment
// follows from its R, F and M scores, so nothing is scored again.
import {
  cellIndex,
  type Score,
  type SegmentMap,
  type SegmentsSummary,
  type SegmentTotals,
  summariseTotals,
} from '@rfm-matrix/core';
import type { CustomerTable } from './customer-table';

const cellOf = (table: CustomerTable, i: number) =>
  cellIndex(table.r[i] as Score, table.f[i] as Score, table.m[i] as Score);

/** Moves every customer to its segment under `map` and returns the new summary. */
export function resegment(table: CustomerTable, map: SegmentMap): SegmentsSummary {
  const ids = map.segments.map((s) => s.id);
  const byCell = Uint8Array.from(map.cells, (id) => ids.indexOf(id));
  const customers = new Float64Array(ids.length);
  const revenue = new Float64Array(ids.length);
  for (let i = 0; i < table.segment.length; i++) {
    const segment = byCell[cellOf(table, i)] ?? 0;
    table.segment[i] = segment;
    customers[segment] = (customers[segment] ?? 0) + 1;
    revenue[segment] = (revenue[segment] ?? 0) + (table.spend[i] ?? 0);
  }
  table.segmentIds = ids;
  const totals: SegmentTotals = new Map();
  ids.forEach((id, s) => {
    if (customers[s]) totals.set(id, { customers: customers[s] ?? 0, revenue: revenue[s] ?? 0 });
  });
  return summariseTotals(totals, map);
}

/** Customers in each of the 125 cells, indexed by `cellIndex`. */
export function cellCustomers(table: CustomerTable): number[] {
  const counts = new Array<number>(125).fill(0);
  for (let i = 0; i < table.segment.length; i++) {
    const cell = cellOf(table, i);
    counts[cell] = (counts[cell] ?? 0) + 1;
  }
  return counts;
}
