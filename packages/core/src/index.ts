// Engine types from TRD §7. Functions arrive with the slices that need them.

export type Score = 1 | 2 | 3 | 4 | 5;

export type OrderRow = {
  customerKey: string;
  orderId: string;
  orderedAt: Date;
  amount: number;
  status?: string;
};

export type ScoringConfig = {
  analysisDate: Date;
  lookbackDays?: number;
  method: 'quantile' | 'fixed';
  fixedBreaks?: { r: number[]; f: number[]; m: number[] };
  amountBasis: 'gross' | 'net';
  subtractRefunds: boolean;
};

export type CustomerScore = {
  customerKey: string;
  recencyDays: number;
  frequency: number;
  monetary: number;
  r: Score;
  f: Score;
  m: Score;
  segmentId: string;
};

export type { Aggregator, CustomerAggregate } from './aggregate';
export { aggregate, createAggregator } from './aggregate';
export type { ColumnIndexes } from './order-row';
export { toOrderRow } from './order-row';
