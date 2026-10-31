// New score thresholds for the worker's analysis (U5). The analysis is scored again and, if it is
// saved on this device, updated in place: the same file and date with corrected settings, so it
// stays one analysis and Movement never compares a file with itself (ADR-0019 notes).
import type { ScoringMethods } from '@rfm-matrix/core';
import type { SaveResult } from '../analysis/protocol';
import type { Analysis, SavedAs } from '../analysis/run-analysis';
import type { ScoringReply, ScoringRequest } from '../analysis/scoring-protocol';
import type { CustomerTable } from '../segment/customer-table';
import { type Rescored, rescore } from '../segment/rescore';
import { putInBatches } from './customer-writes';
import { openDb } from './db';
import { customerRecord, saveFailure } from './save-snapshot';

type ApplyRequest = Extract<ScoringRequest, { type: 'apply-scoring' }>;
type Reply = Extract<ScoringReply, { type: 'scoring-applied' }> | ErrorReply;
type ErrorReply = { type: 'error'; requestId: number; message: string };

export async function handleApplyScoring(
  analysis: Analysis | undefined,
  request: ApplyRequest,
  { now = Date.now } = {},
): Promise<Reply> {
  const { requestId, scoring, map } = request;
  if (!analysis) return { type: 'error', requestId, message: 'No finished analysis to score.' };
  let result: Rescored;
  try {
    result = rescore(analysis.table, scoring, map);
  } catch (error) {
    return {
      type: 'error',
      requestId,
      message: error instanceof Error ? error.message : String(error),
    };
  }
  // An analysis not saved yet keeps the new thresholds for when it is.
  if (analysis.meta) {
    analysis.meta = { ...analysis.meta, scoring, breakpoints: result.breakpoints };
  }
  const saved = analysis.saved
    ? await updateSaved(analysis.saved, analysis.table, scoring, result, now())
    : null;
  return { type: 'scoring-applied', requestId, scoring, ...result, saved };
}

async function updateSaved(
  at: SavedAs,
  table: CustomerTable,
  scoring: ScoringMethods,
  result: Rescored,
  time: number,
): Promise<SaveResult> {
  const db = await openDb();
  try {
    const tx = db.transaction(['projects', 'snapshots', 'customerScores'], 'readwrite');
    const snapshot = await tx.objectStore('snapshots').get(at.snapshotId);
    const project = await tx.objectStore('projects').get(at.projectId);
    if (!snapshot || !project) throw new Error('This analysis is no longer on this device.');
    await tx.objectStore('snapshots').put({
      ...snapshot,
      frozenConfig: { ...snapshot.frozenConfig, scoring },
      breakpoints: result.breakpoints,
    });
    await tx.objectStore('projects').put({ ...project, scoringConfig: scoring, updatedAt: time });
    // Same keys as when saved ([snapshotId, customerKey]), so each record is replaced.
    await putInBatches(tx.objectStore('customerScores'), table.keys.length, (i) =>
      customerRecord(table, i, at.snapshotId),
    );
    await tx.done;
    return { ok: true, projectId: at.projectId, snapshotId: at.snapshotId };
  } catch (error) {
    return saveFailure(error);
  } finally {
    db.close();
  }
}
