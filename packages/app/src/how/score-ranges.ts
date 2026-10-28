// The cut points of an analysis in words (APP_FLOW "How scores work"). A score is 1 plus the
// number of cut points below the value (TRD §8 rule 5); recency is reversed, so 5 is recent.
import type { BinSizes, Breakpoints, Dimension } from '@rfm-matrix/core';
import { formatAmount } from '../screens/format';

export type ScoreRange = { score: number; range: string };

const unit = { r: ['day', 'days'], f: ['order', 'orders'] } as const;

function wholeRanges(d: 'r' | 'f', breaks: Breakpoints): string[] {
  const [one, many] = unit[d];
  const n = (v: number) => `${v.toLocaleString('en-US')} ${v === 1 ? one : many}`;
  // Values are whole numbers, so "up to 12.5" means up to 12.
  const tops = breaks.map((b) => Math.floor(b));
  const ranges: string[] = [];
  let low = d === 'f' ? 1 : 0;
  for (const top of tops) {
    if (top < low) ranges.push('none: two cut points are equal');
    else if (low === top) ranges.push(n(top));
    else if (low <= (d === 'f' ? 1 : 0)) ranges.push(`up to ${n(top)}`);
    else ranges.push(`${low.toLocaleString('en-US')} to ${n(top)}`);
    low = Math.max(low, top + 1);
  }
  ranges.push(`more than ${n(tops[3] ?? 0)}`);
  return ranges;
}

function moneyRanges(breaks: Breakpoints): string[] {
  const ranges = breaks.map((b, i) => {
    const before = breaks[i - 1];
    if (before === undefined) return `up to ${formatAmount(b)}`;
    if (b <= before) return 'none: two cut points are equal';
    return `over ${formatAmount(before)} up to ${formatAmount(b)}`;
  });
  return [...ranges, `over ${formatAmount(breaks[3])}`];
}

/** Scores in display order: 5 to 1 for recency, 1 to 5 otherwise. */
export function scoreRanges(d: Dimension, breaks: Breakpoints): ScoreRange[] {
  const ranges = d === 'm' ? moneyRanges(breaks) : wholeRanges(d, breaks);
  return ranges.map((range, i) => ({ score: d === 'r' ? 5 - i : i + 1, range }));
}

/** Customers per score of each dimension, from the 125 cell counts (by `cellIndex`). */
export function binSizesFrom(cells: number[]): Record<Dimension, BinSizes> {
  const bins = { r: [0, 0, 0, 0, 0], f: [0, 0, 0, 0, 0], m: [0, 0, 0, 0, 0] } as Record<
    Dimension,
    BinSizes
  >;
  cells.forEach((count, i) => {
    const r = Math.floor(i / 25);
    const f = Math.floor(i / 5) % 5;
    const m = i % 5;
    bins.r[r] = (bins.r[r] ?? 0) + count;
    bins.f[f] = (bins.f[f] ?? 0) + count;
    bins.m[m] = (bins.m[m] ?? 0) + count;
  });
  return bins;
}
