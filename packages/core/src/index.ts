// Engine types from TRD §7. Functions arrive with the slices that need them.

export type Score = 1 | 2 | 3 | 4 | 5;

// TRD §7, refined by ADR-0012: an empty date or amount cell is left out, not read as 0, so
// later product lines of an order can carry neither.
export type OrderRow = {
  customerKey: string;
  orderId: string;
  orderedAt?: Date;
  amount?: number;
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

export type { Aggregator, AmountLevel, CustomerAggregate } from './aggregate';
export { aggregate, createAggregator } from './aggregate';
export type { ReadSettings } from './order-row';
export { toOrderRow } from './order-row';
export type { Breakpoints } from './percentile';
export { percentileInc, quintileBreakpoints } from './percentile';
export type { ColumnMapping, Field, Preset, PresetId } from './presets';
export {
  detectPreset,
  fieldLabels,
  guessMapping,
  presets,
  validateMapping,
} from './presets';
export type { BinSizes, ScoredCustomer, ScoreResult } from './score';
export { NotEnoughCustomersError, score } from './score';
export type { Segment, SegmentMap, ValidationResult } from './segments';
export { applySegments, cellIndex, defaultSegmentMap, segmentFor, validateMap } from './segments';
export type { SegmentSummary, SegmentsSummary } from './summary';
export { summariseSegments } from './summary';
export type { DateOrder, DecimalSeparator, DetectedDateOrder } from './values';
export { detectDateOrder, detectDecimal, parseAmount, parseDate } from './values';
