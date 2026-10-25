// R, F and M scores from 1 to 5 (TRD §8, ADR-0004, ADR-0010).

import type { CustomerScore, Score } from './index';
import type { CustomerAggregate } from './orders';
import { type Breakpoints, quintileBreakpoints } from './percentile';

export type ScoredCustomer = Omit<CustomerScore, 'segmentId'>;
export type BinSizes = [number, number, number, number, number];

export type ScoreResult = {
  analysisDate: Date;
  customers: ScoredCustomer[];
  breakpoints: { r: Breakpoints; f: Breakpoints; m: Breakpoints };
  binSizes: { r: BinSizes; f: BinSizes; m: BinSizes };
};

export class NotEnoughCustomersError extends Error {
  constructor(readonly customerCount: number) {
    super(`Scores need at least 5 customers; this data has ${customerCount}.`);
    this.name = 'NotEnoughCustomersError';
  }
}

const dayMs = 86_400_000;
const minimumCustomers = 5;

export type Dimension = 'r' | 'f' | 'm';
/** Quintiles from the data, or four fixed cut points (TRD §8 rules 5–7). */
export type DimensionMethod = { method: 'quantile' } | { method: 'fixed'; breaks: Breakpoints };
export type ScoringMethods = Record<Dimension, DimensionMethod>;

// Frequency defaults to fixed breaks 1, 2, 3, 4–5, 6+ (ADR-0004 rule 6), written as cut points
// for the same formula as quintiles.
export const defaultScoring: ScoringMethods = {
  r: { method: 'quantile' },
  f: { method: 'fixed', breaks: [1, 2, 3, 5] },
  m: { method: 'quantile' },
};

/** Problems with fixed cut points, in plain words; empty when they can be used. */
export function validateBreaks(dimension: Dimension, breaks: number[]): string[] {
  if (breaks.length !== 4) return ['Enter 4 cut points.'];
  if (breaks.some((b) => !Number.isFinite(b))) return ['Every cut point must be a number.'];
  const problems: string[] = [];
  if (breaks.some((b, i) => i > 0 && b <= (breaks[i - 1] ?? b))) {
    problems.push('Each cut point must be larger than the one before.');
  }
  const whole = breaks.every((b) => Number.isInteger(b) && b >= 0);
  if (dimension === 'r' && !whole) problems.push('Use whole numbers of days, from 0 up.');
  if (dimension === 'f' && !whole) problems.push('Use whole numbers of orders.');
  return problems;
}

function breaksFor(dimension: Dimension, method: DimensionMethod, values: number[]): Breakpoints {
  if (method.method === 'quantile') return quintileBreakpoints(values);
  const [problem] = validateBreaks(dimension, [...method.breaks]);
  if (problem) throw new Error(problem);
  return method.breaks;
}

const utcDay = (date: Date) => Math.floor(date.getTime() / dayMs);

/** 1 + the number of breakpoints strictly below the value, so equal values score equally. */
function scoreValue(value: number, breaks: Breakpoints): Score {
  let score = 1;
  for (const b of breaks) if (b < value) score++;
  return score as Score;
}

function binSizes(scores: Score[]): BinSizes {
  const bins: BinSizes = [0, 0, 0, 0, 0];
  for (const s of scores) bins[s - 1] = (bins[s - 1] ?? 0) + 1;
  return bins;
}

export function score(
  customers: CustomerAggregate[],
  options: { analysisDate?: Date; scoring?: ScoringMethods } = {},
): ScoreResult {
  const scoring = options.scoring ?? defaultScoring;
  if (customers.length < minimumCustomers) throw new NotEnoughCustomersError(customers.length);

  let latestDay = Number.NEGATIVE_INFINITY;
  for (const c of customers) latestDay = Math.max(latestDay, utcDay(c.lastOrderAt));
  const analysisDay = options.analysisDate ? utcDay(options.analysisDate) : latestDay + 1;

  const recency = customers.map((c) => analysisDay - utcDay(c.lastOrderAt));
  const breakpoints = {
    r: breaksFor('r', scoring.r, recency),
    f: breaksFor(
      'f',
      scoring.f,
      customers.map((c) => c.orderCount),
    ),
    m: breaksFor(
      'm',
      scoring.m,
      customers.map((c) => c.monetary),
    ),
  };

  const scored = customers.map((c, i): ScoredCustomer => {
    const recencyDays = recency[i] ?? 0;
    return {
      customerKey: c.customerKey,
      recencyDays,
      frequency: c.orderCount,
      monetary: c.monetary,
      r: (6 - scoreValue(recencyDays, breakpoints.r)) as Score,
      f: scoreValue(c.orderCount, breakpoints.f),
      m: scoreValue(c.monetary, breakpoints.m),
      ...(c.email ? { email: c.email } : {}),
    };
  });

  return {
    analysisDate: new Date(analysisDay * dayMs),
    customers: scored,
    breakpoints,
    binSizes: {
      r: binSizes(scored.map((c) => c.r)),
      f: binSizes(scored.map((c) => c.f)),
      m: binSizes(scored.map((c) => c.m)),
    },
  };
}
