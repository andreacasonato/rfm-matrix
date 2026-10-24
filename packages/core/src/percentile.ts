// Percentiles by linear interpolation, as Excel's PERCENTILE.INC computes them (ADR-0010).

export type Breakpoints = [number, number, number, number];

/** `sorted` must be in ascending order and non-empty; `p` is a fraction from 0 to 1. */
export function percentileInc(sorted: Float64Array, p: number): number {
  const h = (sorted.length - 1) * p;
  const below = Math.floor(h);
  const lower = sorted[below] ?? Number.NaN;
  const upper = sorted[Math.min(below + 1, sorted.length - 1)] ?? lower;
  return lower + (h - below) * (upper - lower);
}

export function quintileBreakpoints(values: ArrayLike<number>): Breakpoints {
  const sorted = Float64Array.from(values).sort();
  return [0.2, 0.4, 0.6, 0.8].map((p) => percentileInc(sorted, p)) as Breakpoints;
}
