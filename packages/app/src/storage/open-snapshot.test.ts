import 'fake-indexeddb/auto';
import { defaultSegmentMap, setCell } from '@rfm-matrix/core';
import { afterEach, describe, expect, it } from 'vitest';
import type { AnalysisPlan, DoneMessage, WorkerMessage } from '../analysis/protocol';
import { runAnalysis } from '../analysis/run-analysis';
import { segmentRows } from '../segment/customer-table';
import { dbName } from './db';
import { runOpenSnapshot } from './open-snapshot';
import { listProjects, loadProject, saveProjectMap } from './projects';
import { handleSave } from './save-snapshot';

afterEach(async () => {
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = request.onerror = resolve;
  });
});

const csv = [
  'Order,Customer ID,Email,Date,Total',
  ...Array.from(
    { length: 12 },
    (_, i) => `#${i},C${i % 6},c${i % 6}@example.test,2026-0${(i % 9) + 1}-02,${5 + i}.10`,
  ),
].join('\n');
const plan: AnalysisPlan = {
  mapping: { orderId: 0, customerId: 1, email: 2, orderedAt: 3, amount: 4 },
  read: { decimal: '.', dateOrder: 'dmy' },
  amountLevel: 'order',
};

async function analyseAndSave() {
  const messages: WorkerMessage[] = [];
  const analysis = await runAnalysis(csv, plan, (m) => messages.push(m));
  const done = messages.find((m): m is DoneMessage => m.type === 'done');
  if (!analysis || !done) throw new Error('analysis failed');
  const target = { projectName: 'Shop', sourceFileName: 'orders.csv', map: defaultSegmentMap };
  const { result } = await handleSave(analysis, { type: 'save', requestId: 1, target });
  if (!result.ok) throw new Error(result.message);
  return { done, ...result };
}

async function open(snapshotId: string, map = defaultSegmentMap) {
  const messages: WorkerMessage[] = [];
  const analysis = await runOpenSnapshot(snapshotId, map, (m) => messages.push(m));
  return { analysis, messages };
}

describe('opening a saved snapshot (S8)', () => {
  it('shows the same grid as the analysis that was saved, without the file', async () => {
    const { done, snapshotId } = await analyseAndSave();
    const { analysis, messages } = await open(snapshotId);
    const reopened = messages.find((m): m is DoneMessage => m.type === 'done');
    expect(reopened).toMatchObject({
      customers: done.customers,
      orders: done.orders,
      monetaryTotal: done.monetaryTotal,
      repeatCustomers: done.repeatCustomers,
      analysisDate: done.analysisDate,
      cellCustomers: done.cellCustomers,
      cleaning: done.cleaning,
    });
    // Money is stored in whole cents, so revenue matches to the cent, not to float noise.
    const cents = (grid: DoneMessage['grid'] = []) =>
      grid.map((c) => ({ ...c, revenue: Math.round(c.revenue * 100) }));
    expect(cents(reopened?.grid)).toEqual(cents(done.grid));
    expect(reopened?.segments.segments.map((s) => s.customers)).toEqual(
      done.segments.segments.map((s) => s.customers),
    );
    expect(analysis?.table.emails).toContain('c1@example.test');
  });

  it("uses the project's current rules", async () => {
    const { snapshotId } = await analyseAndSave();
    const everyoneLost = { ...defaultSegmentMap, cells: defaultSegmentMap.cells.map(() => 'lost') };
    const { analysis } = await open(snapshotId, everyoneLost);
    expect(analysis && segmentRows(analysis.table, 'lost')).toHaveLength(6);
  });

  it('says so when the snapshot is gone', async () => {
    const { messages } = await open('missing');
    expect(messages).toEqual([
      { type: 'error', message: 'This saved analysis is no longer on this device.' },
    ]);
  });
});

describe('projects on this device', () => {
  it('lists projects newest first with their latest snapshot', async () => {
    const { projectId, snapshotId } = await analyseAndSave();
    expect(await listProjects()).toEqual([
      expect.objectContaining({
        id: projectId,
        name: 'Shop',
        snapshots: 1,
        latest: expect.objectContaining({ id: snapshotId, sourceFileName: 'orders.csv' }),
      }),
    ]);
  });

  it('loads a project and keeps edited rules', async () => {
    const { projectId } = await analyseAndSave();
    const edited = setCell(defaultSegmentMap, { r: 1, f: 1, m: 'all' }, 'hibernating');
    await saveProjectMap(projectId, edited);
    const project = await loadProject(projectId);
    expect(project?.map.cells).toEqual(edited.cells);
    expect(project?.map.segments).toEqual(defaultSegmentMap.segments);
    expect(project?.snapshots).toHaveLength(1);
  });

  it('lists nothing on a fresh device', async () => {
    expect(await listProjects()).toEqual([]);
  });
});
