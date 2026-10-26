// The records kept on this device (SCHEMA.md). Raw order rows are never stored: one scored
// record per customer per snapshot, and email only when it was mapped. Times are epoch ms.
import type {
  AmountLevel,
  Breakpoints,
  CleaningCounts,
  CleaningRules,
  ColumnMapping,
  ReadSettings,
  Score,
  ScoringMethods,
  SegmentMap,
} from '@rfm-matrix/core';
import type { DBSchema } from 'idb';

/** How the file's columns become orders (the Map columns screen). */
export type StoredMapping = {
  columns: ColumnMapping;
  read: ReadSettings;
  amountLevel: AmountLevel;
};

export type ProjectRecord = {
  id: string;
  name: string;
  schemaVersion: number;
  currency?: string;
  platformPreset?: string;
  columnMapping: StoredMapping;
  cleaningRules?: CleaningRules;
  scoringConfig?: ScoringMethods;
  createdAt: number;
  updatedAt: number;
};

export type SegmentMapRecord = SegmentMap & { id: string; projectId: string; updatedAt: number };

export type SnapshotRecord = {
  id: string;
  projectId: string;
  createdAt: number;
  sourceFileName: string;
  /** SHA-256 fingerprint of the file's size, first and last 4 MB (ADR-0019). */
  sourceFileHash: string;
  /** UTC calendar date, YYYY-MM-DD (ADR-0010). */
  analysisDate: string;
  frozenConfig: { mapping: StoredMapping; cleaning?: CleaningRules; scoring: ScoringMethods };
  frozenMap: SegmentMap;
  breakpoints: { r: Breakpoints; f: Breakpoints; m: Breakpoints };
  rowCounts: { read: number; excluded: number; used: number };
  customerCount: number;
  /** Totals the grid shows, so a saved snapshot opens without the file. */
  report: {
    orders: number;
    monetaryTotal: number;
    repeatCustomers: number;
    cleaning: CleaningCounts;
  };
};

export type CustomerScoreRecord = {
  snapshotId: string;
  customerKey: string;
  email?: string;
  firstOrderAt: number;
  lastOrderAt: number;
  recencyDays: number;
  frequency: number;
  monetaryMinor: number;
  r: Score;
  f: Score;
  m: Score;
  segmentId: string;
};

export type SettingsRecord = { lastProjectId?: string; onboardingDone: boolean };

export interface RfmDb extends DBSchema {
  projects: { key: string; value: ProjectRecord; indexes: { updatedAt: number } };
  segmentMaps: { key: string; value: SegmentMapRecord; indexes: { projectId: string } };
  snapshots: {
    key: string;
    value: SnapshotRecord;
    indexes: { projectId_createdAt: [string, number] };
  };
  customerScores: {
    key: [string, string];
    value: CustomerScoreRecord;
    indexes: { snapshotId_segmentId: [string, string] };
  };
  settings: { key: 'app'; value: SettingsRecord };
}
