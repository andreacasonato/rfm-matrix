// New score thresholds for a finished analysis (U5): the worker keeps every customer's days,
// orders and total spent, so scores are worked out again without reading the file. The rule is
// core's (TRD §8); this only applies it to the customer table.
import {
  type BinSizes,
  type Breakpoints,
  breakpointsFor,
  type CustomerScore,
  type Dimension,
  type DimensionMethod,
  type GridCell,
  gridCells,
  type Score,
  type ScoringMethods,
  type SegmentMap,
  type SegmentsSummary,
  scoreFor,
} from '@rfm-matrix/core';
import type { CustomerTable } from './customer-table';
import { cellCustomers, resegment } from './resegment';

const valuesOf = (table: CustomerTable, d: Dimension) =>
  Array.from(d === 'r' ? table.recencyDays : d === 'f' ? table.orders : table.spend);

/** How many customers each score 1–5 would hold under `method`; changes nothing. */
export function scoreCounts(
  table: CustomerTable,
  dimension: Dimension,
  method: DimensionMethod,
): { breakpoints: Breakpoints; counts: BinSizes } {
  const values = valuesOf(table, dimension);
  const breakpoints = breakpointsFor(dimension, method, values);
  const counts: BinSizes = [0, 0, 0, 0, 0];
  for (const v of values) {
    const s = scoreFor(dimension, v, breakpoints);
    counts[s - 1] = (counts[s - 1] ?? 0) + 1;
  }
  return { breakpoints, counts };
}

export type Rescored = {
  breakpoints: Record<Dimension, Breakpoints>;
  segments: SegmentsSummary;
  grid: GridCell[];
  cellCustomers: number[];
};

/** Scores every customer again under `scoring` and moves them to their segments under `map`. */
export function rescore(table: CustomerTable, scoring: ScoringMethods, map: SegmentMap): Rescored {
  // All cut points first, so unusable thresholds throw before any score changes.
  const breakpoints = {
    r: breakpointsFor('r', scoring.r, valuesOf(table, 'r')),
    f: breakpointsFor('f', scoring.f, valuesOf(table, 'f')),
    m: breakpointsFor('m', scoring.m, valuesOf(table, 'm')),
  };
  for (let i = 0; i < table.keys.length; i++) {
    table.r[i] = scoreFor('r', table.recencyDays[i] ?? 0, breakpoints.r);
    table.f[i] = scoreFor('f', table.orders[i] ?? 0, breakpoints.f);
    table.m[i] = scoreFor('m', table.spend[i] ?? 0, breakpoints.m);
  }
  const segments = resegment(table, map);
  // gridCells reads only the scores and the amount of each customer.
  const scored = Array.from(
    table.r,
    (r, i) =>
      ({ r: r as Score, f: table.f[i] as Score, monetary: table.spend[i] ?? 0 }) as CustomerScore,
  );
  return {
    breakpoints,
    segments,
    grid: gridCells(scored, map),
    cellCustomers: cellCustomers(table),
  };
}
