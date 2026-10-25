// Messages between the page and the analysis worker (ADR-0003).
import type {
  AmountLevel,
  CleaningCounts,
  CleaningRules,
  ColumnMapping,
  GridCell,
  OrderProfile,
  ReadSettings,
  ScoringMethods,
  SegmentsSummary,
} from '@rfm-matrix/core';
import type { CsvPreview, TextEncodingName, UnreadableKind } from '@rfm-matrix/io';
import type { SegmentPage, Sort } from '../segment/customer-table';

/** How to turn the file's rows into orders (ADR-0012), confirmed on the Map columns screen. */
export type AnalysisPlan = {
  mapping: ColumnMapping;
  read: ReadSettings;
  amountLevel: AmountLevel;
  /** Chosen on the cleaning screen; without it every order counts. */
  cleaning?: CleaningRules;
  /** Chosen on the cleaning screen; without it the default methods apply (ADR-0004). */
  scoring?: ScoringMethods;
};

/** How to read the file; missing fields are detected. */
export type CsvFormat = { encoding?: TextEncodingName; delimiter?: string };

export type StartMessage = { type: 'start'; file: Blob; plan: AnalysisPlan; format: CsvFormat };
export type PreviewRequest = { type: 'preview'; file: Blob; format: CsvFormat };
export type SummaryRequest = { type: 'summary'; file: Blob; plan: AnalysisPlan; format: CsvFormat };
/** Questions about the last finished analysis, answered by the same worker (S6). */
export type SessionRequest =
  | {
      type: 'segment-page';
      requestId: number;
      segmentId: string;
      sort: Sort;
      page: number;
      pageSize: number;
    }
  | { type: 'export'; requestId: number; segmentId: string; segmentName: string };
export type WorkerRequest = StartMessage | PreviewRequest | SummaryRequest | SessionRequest;

export type ProgressMessage = {
  type: 'progress';
  rowsRead: number;
  bytesRead: number;
  customers: number;
};

export type DoneMessage = {
  type: 'done';
  rowsRead: number;
  rowsUsed: number;
  invalidRows: number;
  customers: number;
  orders: number;
  monetaryTotal: number;
  cleaning: CleaningCounts;
  scoring: ScoringMethods;
  problems: { row: number; message: string }[];
  /** UTC calendar date, YYYY-MM-DD (ADR-0010). */
  analysisDate: string;
  segments: SegmentsSummary;
  /** The 25 R × F cells for the grid (S5), in display order. */
  grid: GridCell[];
  /** Customers with two or more orders. */
  repeatCustomers: number;
  elapsedMs: number;
};

export type PreviewProgressMessage = {
  type: 'preview-progress';
  rowsRead: number;
  bytesRead: number;
};
export type PreviewDoneMessage = { type: 'preview-done'; preview: CsvPreview };

/** What the cleaning screen needs: orders by status and day, and how many rows were usable. */
export type FileSummary = {
  profile: OrderProfile;
  rowsRead: number;
  rowsUsed: number;
  customers: number;
};
export type SummaryProgressMessage = {
  type: 'summary-progress';
  rowsRead: number;
  bytesRead: number;
  customers: number;
};
export type SummaryDoneMessage = { type: 'summary-done'; summary: FileSummary };

export type ErrorMessage = {
  type: 'error';
  message: string;
  unreadable?: UnreadableKind;
  /** Set when the error answers a session request. */
  requestId?: number;
};

export type SessionReply =
  | { type: 'segment-page-done'; requestId: number; page: SegmentPage }
  | { type: 'export-done'; requestId: number; file: Blob; rows: number }
  | ErrorMessage;

export type WorkerMessage =
  | ProgressMessage
  | DoneMessage
  | PreviewProgressMessage
  | PreviewDoneMessage
  | SummaryProgressMessage
  | SummaryDoneMessage
  | SessionReply;
