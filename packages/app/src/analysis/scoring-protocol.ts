// Messages for score thresholds on a finished analysis (U5), part of the session protocol.
import type {
  BinSizes,
  Breakpoints,
  Dimension,
  DimensionMethod,
  GridCell,
  ScoringMethods,
  SegmentMap,
  SegmentsSummary,
} from '@rfm-matrix/core';
import type { SaveResult } from './protocol';

export type ScoringRequest =
  /** How many customers each score would hold under a draft threshold; changes nothing. */
  | { type: 'score-counts'; requestId: number; dimension: Dimension; method: DimensionMethod }
  /** Scores every customer again, and updates the saved analysis in place if there is one. */
  | { type: 'apply-scoring'; requestId: number; scoring: ScoringMethods; map: SegmentMap };

export type ScoringReply =
  | { type: 'score-counts-done'; requestId: number; breakpoints: Breakpoints; counts: BinSizes }
  | {
      type: 'scoring-applied';
      requestId: number;
      scoring: ScoringMethods;
      breakpoints: Record<Dimension, Breakpoints>;
      segments: SegmentsSummary;
      grid: GridCell[];
      cellCustomers: number[];
      /** Null when the analysis is not saved on this device, such as the sample. */
      saved: SaveResult | null;
    };
