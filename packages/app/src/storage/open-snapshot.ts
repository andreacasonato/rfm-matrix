// Opens a saved snapshot in the worker (S8): the customer table is rebuilt from its records and
// the page gets the same "done" message as after reading a file, under the project's rules.
import { applySegments, gridCells, type SegmentMap, summariseSegments } from '@rfm-matrix/core';
import type { WorkerMessage } from '../analysis/protocol';
import type { Analysis } from '../analysis/run-analysis';
import { errorMessage } from '../analysis/worker-error';
import { buildCustomerTable } from '../segment/customer-table';
import { cellCustomers } from '../segment/resegment';
import { openDb } from './db';

export async function runOpenSnapshot(
  snapshotId: string,
  map: SegmentMap,
  post: (message: WorkerMessage) => void,
  { now = () => performance.now() } = {},
): Promise<Analysis | undefined> {
  const started = now();
  const db = await openDb();
  try {
    const snapshot = await db.get('snapshots', snapshotId);
    if (!snapshot) throw new Error('This saved analysis is no longer on this device.');
    // Every record of this snapshot: keys [snapshotId, customerKey] sort between these two.
    const records = await db.getAll(
      'customerScores',
      IDBKeyRange.bound([snapshotId], [snapshotId, []]),
    );
    const scores = applySegments(
      records.map((c) => ({
        customerKey: c.customerKey,
        recencyDays: c.recencyDays,
        frequency: c.frequency,
        monetary: c.monetaryMinor / 100,
        r: c.r,
        f: c.f,
        m: c.m,
        ...(c.email ? { email: c.email } : {}),
      })),
      map,
    );
    const withEmail = snapshot.frozenConfig.mapping.columns.email !== undefined;
    const table = buildCustomerTable(scores, withEmail, records);
    const { rowCounts, report } = snapshot;
    post({
      type: 'done',
      rowsRead: rowCounts.read,
      rowsUsed: rowCounts.used,
      invalidRows: rowCounts.excluded,
      customers: records.length,
      orders: report.orders,
      monetaryTotal: report.monetaryTotal,
      cleaning: report.cleaning,
      scoring: snapshot.frozenConfig.scoring,
      problems: [],
      analysisDate: snapshot.analysisDate,
      segments: summariseSegments(scores, map),
      grid: gridCells(scores, map),
      cellCustomers: cellCustomers(table),
      breakpoints: snapshot.breakpoints,
      repeatCustomers: report.repeatCustomers,
      elapsedMs: now() - started,
    });
    return { table };
  } catch (error) {
    post(errorMessage(error));
    return undefined;
  } finally {
    db.close();
  }
}
