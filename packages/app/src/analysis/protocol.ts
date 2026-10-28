// Messages between the page and the analysis worker (ADR-0003).
import type {
  AmountLevel,
  Breakpoints,
  CleaningCounts,
  CleaningRules,
  ColumnMapping,
  Field,
  GridCell,
  Movement,
  OrderProfile,
  ReadSettings,
  ScoringMethods,
  SegmentMap,
  SegmentsSummary,
} from '@rfm-matrix/core';
import type { CsvPreview, TextEncodingName, UnreadableKind } from '@rfm-matrix/io';
import type { SegmentPage, Sort } from '../segment/customer-table';

/** How to turn the file's rows into orders (ADR-0012), confirmed on the Map columns screen. */
export type AnalysisPlan = {
  mapping: ColumnMapping;
  /** Header names of the mapped columns, kept with a saved project (journey 4). */
  columnNames?: Partial<Record<Field, string>>;
  read: ReadSettings;
  amountLevel: AmountLevel;
  /** Chosen on the cleaning screen; without it every order counts. */
  cleaning?: CleaningRules;
  /** Chosen on the cleaning screen; without it the default methods apply (ADR-0004). */
  scoring?: ScoringMethods;
  /** A saved project's rules (S8); without it the default map applies. */
  segmentMap?: SegmentMap;
};

/** How to read the file; missing fields are detected. */
export type CsvFormat = { encoding?: TextEncodingName; delimiter?: string };

export type StartMessage = { type: 'start'; file: Blob; plan: AnalysisPlan; format: CsvFormat };
/** Opens a saved snapshot instead of reading a file (S8). */
export type OpenMessage = { type: 'open'; snapshotId: string; map: SegmentMap };
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
  | { type: 'export'; requestId: number; segmentId: string; segmentName: string }
  /** Re-assigns every customer with an edited map (S7). */
  | { type: 'apply-map'; requestId: number; map: SegmentMap };
/** Where to save a finished analysis (S8): a new project, or a snapshot of an existing one. */
export type SaveTarget = {
  projectId?: string;
  projectName: string;
  sourceFileName: string;
  map: SegmentMap;
};
export type SaveRequest = { type: 'save'; requestId: number; target: SaveTarget };
export type SaveResult =
  | { ok: true; projectId: string; snapshotId: string }
  | { ok: false; storageFull: boolean; message: string };
export type SaveReply = { type: 'saved'; requestId: number; result: SaveResult };

/** Save project file and Open project file run in a worker, off the page (S9). */
export type ProjectFileRequest =
  | { type: 'export-project'; projectId: string }
  | { type: 'import-project'; file: Blob };
export type ProjectExportedMessage = {
  type: 'project-exported';
  file: Blob;
  name: string;
  hasEmail: boolean;
};
export type ProjectImportedMessage = {
  type: 'project-imported';
  result:
    | { ok: true; projectId: string; latestSnapshotId: string | undefined }
    | { ok: false; problems: string[] };
};

/** Movement between two saved snapshots, and one flow's customers as CSV (S10). */
export type MovementRequest =
  | { type: 'movement'; earlierId: string; laterId: string; map: SegmentMap }
  | {
      type: 'export-movers';
      earlierId: string;
      laterId: string;
      map: SegmentMap;
      from: string;
      to: string;
    };
export type MovementDoneMessage = { type: 'movement-done'; movement: Movement };
export type MoversExportedMessage = {
  type: 'movers-exported';
  file: Blob;
  name: string;
  rows: number;
};

export type WorkerRequest =
  | MovementRequest
  | ProjectFileRequest
  | StartMessage
  | OpenMessage
  | PreviewRequest
  | SummaryRequest
  | SessionRequest
  | SaveRequest;

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
  /** Customers in each of the 125 R × F × M cells, by `cellIndex` (S7). */
  cellCustomers: number[];
  /** The cut points behind the scores (How scores work). */
  breakpoints: Record<'r' | 'f' | 'm', Breakpoints>;
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

/** Why a file could not be read: a file check, or the browser running out of memory. */
export type ReadFailure = UnreadableKind | 'out-of-memory';

export type ErrorMessage = {
  type: 'error';
  message: string;
  unreadable?: ReadFailure;
  /** How many customers there were when too few to score (TRD §11). */
  tooFewCustomers?: number;
  /** Set when the error answers a session request. */
  requestId?: number;
};

export type SessionReply =
  | { type: 'segment-page-done'; requestId: number; page: SegmentPage }
  | { type: 'export-done'; requestId: number; file: Blob; rows: number }
  | { type: 'map-applied'; requestId: number; segments: SegmentsSummary }
  | SaveReply
  | ErrorMessage;

export type WorkerMessage =
  | ProgressMessage
  | DoneMessage
  | PreviewProgressMessage
  | PreviewDoneMessage
  | SummaryProgressMessage
  | SummaryDoneMessage
  | ProjectExportedMessage
  | ProjectImportedMessage
  | MovementDoneMessage
  | MoversExportedMessage
  | SessionReply;
