// Saves a finished analysis on this device (S8), from the worker that holds it: the project,
// its rules, the snapshot and one record per customer, in one transaction, so a full disk saves
// nothing rather than half a snapshot.
import { type Score, validateMap } from '@rfm-matrix/core';
import type { SaveReply, SaveRequest, SaveResult } from '../analysis/protocol';
import type { Analysis } from '../analysis/run-analysis';
import { resegment } from '../segment/resegment';
import { openDb } from './db';
import { fileFingerprint } from './fingerprint';
import type { CustomerScoreRecord, ProjectRecord, StoredMapping } from './schema';

/** The project file and database layout version (SCHEMA.md). */
export const schemaVersion = 1;

export function saveFailure(error: unknown): SaveResult {
  const message = error instanceof Error ? error.message : String(error);
  const storageFull = error instanceof DOMException && error.name === 'QuotaExceededError';
  return { ok: false, storageFull, message };
}

export async function handleSave(
  analysis: Analysis | undefined,
  request: SaveRequest,
  { now = Date.now, newId = () => crypto.randomUUID() } = {},
): Promise<SaveReply> {
  const reply = (result: SaveResult): SaveReply => ({
    type: 'saved',
    requestId: request.requestId,
    result,
  });
  if (!analysis) return reply(saveFailure(new Error('No finished analysis to save.')));
  const { table, meta } = analysis;
  if (!meta) return reply(saveFailure(new Error('This analysis is already saved.')));
  const { target } = request;
  const validation = validateMap(target.map);
  if (!validation.ok) return reply(saveFailure(new Error(validation.problems.join(' '))));
  resegment(table, target.map);
  // Before the transaction: an await on anything else would let it commit early.
  const sourceFileHash = await fileFingerprint(meta.source);
  const db = await openDb();
  try {
    const tx = db.transaction(
      ['projects', 'segmentMaps', 'snapshots', 'customerScores'],
      'readwrite',
    );
    const time = now();
    const mapping: StoredMapping = {
      columns: meta.plan.mapping,
      read: meta.plan.read,
      amountLevel: meta.plan.amountLevel,
    };
    const existing = target.projectId
      ? await tx.objectStore('projects').get(target.projectId)
      : undefined;
    if (target.projectId && !existing) throw new Error('This project is no longer on this device.');
    const project: ProjectRecord = {
      ...(existing ?? { id: newId(), name: target.projectName, createdAt: time }),
      schemaVersion,
      columnMapping: mapping,
      ...(meta.plan.cleaning ? { cleaningRules: meta.plan.cleaning } : {}),
      scoringConfig: meta.scoring,
      updatedAt: time,
    };
    await tx.objectStore('projects').put(project);
    const maps = tx.objectStore('segmentMaps');
    const oldMap = await maps.index('projectId').get(project.id);
    await maps.put({
      ...target.map,
      id: oldMap?.id ?? newId(),
      projectId: project.id,
      updatedAt: time,
    });

    const snapshotId = newId();
    await tx.objectStore('snapshots').put({
      id: snapshotId,
      projectId: project.id,
      createdAt: time,
      sourceFileName: target.sourceFileName,
      sourceFileHash,
      analysisDate: meta.analysisDate,
      frozenConfig: {
        mapping,
        ...(meta.plan.cleaning ? { cleaning: meta.plan.cleaning } : {}),
        scoring: meta.scoring,
      },
      frozenMap: target.map,
      breakpoints: meta.breakpoints,
      rowCounts: meta.rowCounts,
      customerCount: table.keys.length,
      report: meta.report,
    });
    const scores = tx.objectStore('customerScores');
    for (let i = 0; i < table.keys.length; i++) {
      const email = table.emails?.[i];
      const record: CustomerScoreRecord = {
        snapshotId,
        customerKey: table.keys[i] ?? '',
        ...(email ? { email } : {}),
        firstOrderAt: table.firstOrderAt[i] ?? 0,
        lastOrderAt: table.lastOrderAt[i] ?? 0,
        recencyDays: table.recencyDays[i] ?? 0,
        frequency: table.orders[i] ?? 0,
        monetaryMinor: Math.round((table.spend[i] ?? 0) * 100),
        r: table.r[i] as Score,
        f: table.f[i] as Score,
        m: table.m[i] as Score,
        segmentId: table.segmentIds[table.segment[i] ?? 0] ?? '',
      };
      // Not awaited one by one: the requests queue in the transaction, which commits at the end.
      void scores.put(record);
    }
    await tx.done;
    return reply({ ok: true, projectId: project.id, snapshotId });
  } catch (error) {
    return reply(saveFailure(error));
  } finally {
    db.close();
  }
}
