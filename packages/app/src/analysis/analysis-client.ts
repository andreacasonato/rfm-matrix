// The worker that ran an analysis, or opened a saved one, kept open for questions about it:
// segment pages and exports (S6), rules edits (S7), saving on this device (S8) and new score
// thresholds (U5).
import type {
  BinSizes,
  Breakpoints,
  Dimension,
  DimensionMethod,
  ScoringMethods,
  SegmentMap,
  SegmentsSummary,
} from '@rfm-matrix/core';
import type { SegmentPage, Sort } from '../segment/customer-table';
import type {
  AnalysisPlan,
  CsvFormat,
  DoneMessage,
  ProgressMessage,
  SaveResult,
  SaveTarget,
} from './protocol';
import type { ScoringReply } from './scoring-protocol';
import { type JobHandle, startJob, WorkerJobError } from './worker-client';

export type ScoringApplied = Omit<
  Extract<ScoringReply, { type: 'scoring-applied' }>,
  'type' | 'requestId'
>;

/** Questions about a finished analysis, answered by the worker that ran it (S6). */
export type AnalysisSession = {
  segmentPage(segmentId: string, sort: Sort, page: number, pageSize: number): Promise<SegmentPage>;
  exportSegment(segmentId: string, segmentName: string): Promise<{ file: Blob; rows: number }>;
  applyMap(map: SegmentMap): Promise<SegmentsSummary>;
  /** Saves the analysis on this device (S8); never rejects for a full disk. */
  save(target: SaveTarget): Promise<SaveResult>;
  /** Customers per score 1–5 under a draft threshold (U5). */
  scoreCounts(
    dimension: Dimension,
    method: DimensionMethod,
  ): Promise<{ breakpoints: Breakpoints; counts: BinSizes }>;
  /** Scores every customer again; a saved analysis is updated in place (U5). */
  applyScoring(scoring: ScoringMethods, map: SegmentMap): Promise<ScoringApplied>;
};

export type AnalysisHandle = JobHandle<DoneMessage> & { session: AnalysisSession };

/** Runs an analysis; the worker stays open for segment questions until cancel() closes it. */
export function startAnalysis(
  file: Blob,
  plan: AnalysisPlan,
  format: CsvFormat,
  onProgress: (progress: ProgressMessage) => void,
): AnalysisHandle {
  return withSession(
    startJob<DoneMessage, ProgressMessage>(
      { type: 'start', file, plan, format },
      'done',
      'progress',
      onProgress,
      { keepAlive: true },
    ),
  );
}

/** Segment questions to the worker that holds a finished analysis. */
function withSession(
  job: ReturnType<typeof startJob<DoneMessage, ProgressMessage>>,
): AnalysisHandle {
  const session: AnalysisSession = {
    async segmentPage(segmentId, sort, page, pageSize) {
      const reply = await job.ask({ type: 'segment-page', segmentId, sort, page, pageSize });
      if (reply.type !== 'segment-page-done') throw new WorkerJobError('Unexpected reply');
      return reply.page;
    },
    async exportSegment(segmentId, segmentName) {
      const reply = await job.ask({ type: 'export', segmentId, segmentName });
      if (reply.type !== 'export-done') throw new WorkerJobError('Unexpected reply');
      return { file: reply.file, rows: reply.rows };
    },
    async applyMap(map) {
      const reply = await job.ask({ type: 'apply-map', map });
      if (reply.type !== 'map-applied') throw new WorkerJobError('Unexpected reply');
      return reply.segments;
    },
    async save(target) {
      const reply = await job.ask({ type: 'save', target });
      if (reply.type !== 'saved') throw new WorkerJobError('Unexpected reply');
      return reply.result;
    },
    async scoreCounts(dimension, method) {
      const reply = await job.ask({ type: 'score-counts', dimension, method });
      if (reply.type !== 'score-counts-done') throw new WorkerJobError('Unexpected reply');
      return { breakpoints: reply.breakpoints, counts: reply.counts };
    },
    async applyScoring(scoring, map) {
      const reply = await job.ask({ type: 'apply-scoring', scoring, map });
      if (reply.type !== 'scoring-applied') throw new WorkerJobError('Unexpected reply');
      const { type: _, requestId: __, ...applied } = reply;
      return applied;
    },
  };
  return { result: job.result, cancel: job.cancel, session };
}

/** Opens a saved snapshot (S8); answers segment questions like a fresh analysis. */
export function openSnapshot(
  snapshotId: string,
  map: SegmentMap,
  onProgress: (progress: ProgressMessage) => void,
): AnalysisHandle {
  return withSession(
    startJob<DoneMessage, ProgressMessage>(
      { type: 'open', snapshotId, map },
      'done',
      'progress',
      onProgress,
      { keepAlive: true },
    ),
  );
}
