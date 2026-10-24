// R, F and M scores from 1 to 5 (TRD §8, ADR-0004, ADR-0010).
import type { CustomerAggregate } from './aggregate';
import type { CustomerScore, Score } from './index';
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
// Fixed frequency breaks 1, 2, 3, 4–5, 6+ written as breakpoints for the same formula.
const frequencyBreaks: Breakpoints = [1, 2, 3, 5];

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
  options: { analysisDate?: Date } = {},
): ScoreResult {
  if (customers.length < minimumCustomers) throw new NotEnoughCustomersError(customers.length);

  let latestDay = Number.NEGATIVE_INFINITY;
  for (const c of customers) latestDay = Math.max(latestDay, utcDay(c.lastOrderAt));
  const analysisDay = options.analysisDate ? utcDay(options.analysisDate) : latestDay + 1;

  const recency = customers.map((c) => analysisDay - utcDay(c.lastOrderAt));
  const breakpoints = {
    r: quintileBreakpoints(recency),
    f: frequencyBreaks,
    m: quintileBreakpoints(customers.map((c) => c.monetary)),
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
