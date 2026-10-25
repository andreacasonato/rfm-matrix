// Messages between the page and the analysis worker (ADR-0003).
import type {
  AmountLevel,
  CleaningCounts,
  CleaningRules,
  ColumnMapping,
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
export type WorkerRequest = StartMessage | PreviewRequest;

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

export type ErrorMessage = { type: 'error'; message: string; unreadable?: UnreadableKind };

export type WorkerMessage =
  | ProgressMessage
  | DoneMessage
  | PreviewProgressMessage
  | PreviewDoneMessage
  | ErrorMessage;
