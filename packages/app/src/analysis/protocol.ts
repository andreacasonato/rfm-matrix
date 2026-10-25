// Messages between the page and the analysis worker (ADR-0003).
import type {
  AmountLevel,
  CleaningCounts,
  CleaningRules,
  ColumnMapping,
  OrderProfile,
  ReadSettings,
  SegmentsSummary,
} from '@rfm-matrix/core';
import type { CsvPreview, TextEncodingName, UnreadableKind } from '@rfm-matrix/io';

/** How to turn the file's rows into orders (ADR-0012), confirmed on the Map columns screen. */
export type AnalysisPlan = {
  mapping: ColumnMapping;
  read: ReadSettings;
  amountLevel: AmountLevel;
  /** Chosen on the cleaning screen; without it every order counts. */
  cleaning?: CleaningRules;
};

/** How to read the file; missing fields are detected. */
export type CsvFormat = { encoding?: TextEncodingName; delimiter?: string };

export type StartMessage = { type: 'start'; file: Blob; plan: AnalysisPlan; format: CsvFormat };
export type PreviewRequest = { type: 'preview'; file: Blob; format: CsvFormat };
export type SummaryRequest = { type: 'summary'; file: Blob; plan: AnalysisPlan; format: CsvFormat };
export type WorkerRequest = StartMessage | PreviewRequest | SummaryRequest;

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
  problems: { row: number; message: string }[];
  /** UTC calendar date, YYYY-MM-DD (ADR-0010). */
  analysisDate: string;
  segments: SegmentsSummary;
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

export type ErrorMessage = { type: 'error'; message: string; unreadable?: UnreadableKind };

export type WorkerMessage =
  | ProgressMessage
  | DoneMessage
  | PreviewProgressMessage
  | PreviewDoneMessage
  | SummaryProgressMessage
  | SummaryDoneMessage
  | ErrorMessage;
