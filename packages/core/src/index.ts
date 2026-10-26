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
  // Optional order values for refunds and net amounts (ADR-0013).
  refunded?: number;
  tax?: number;
  shipping?: number;
  /** As written in the file; only when an email column is mapped (SCHEMA.md). */
  email?: string;
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
  email?: string;
};

export type {
  CleaningCounts,
  CleaningRules,
  OrderCounts,
  OrderProfile,
} from './cleaning';
export {
  defaultExcludedStatuses,
  isExcludedByDefault,
  normaliseStatus,
  orderCounts,
  statusCounts,
} from './cleaning';
export type { GridCell } from './grid';
export { gridCells } from './grid';
export type { ReadSettings } from './order-row';
export { toOrderRow } from './order-row';
export type { AmountLevel, CustomerAggregate, OrderBookResult } from './orders';
export { OrderBook } from './orders';
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
export type {
  BinSizes,
  Dimension,
  DimensionMethod,
  ScoredCustomer,
  ScoreResult,
  ScoringMethods,
} from './score';
export { defaultScoring, NotEnoughCustomersError, score, validateBreaks } from './score';
export type { CellTarget } from './segment-edits';
export { copyLayer, describeCell, rfSegment, sameForEveryM, setCell } from './segment-edits';
export type { MapFileResult } from './segment-map-file';
export { maxMapFileLength, segmentMapFromFile, segmentMapToFile } from './segment-map-file';
export type { Segment, SegmentMap, ValidationResult } from './segments';
export { applySegments, cellIndex, defaultSegmentMap, segmentFor, validateMap } from './segments';
export type { SegmentSummary, SegmentsSummary } from './summary';
export { summariseSegments } from './summary';
export type { DateOrder, DecimalSeparator, DetectedDateOrder } from './values';
export { detectDateOrder, detectDecimal, parseAmount, parseDate } from './values';
