import 'fake-indexeddb/auto';
import { defaultSegmentMap, type ScoringMethods } from '@rfm-matrix/core';
import { afterEach, describe, expect, it } from 'vitest';
import type { AnalysisPlan } from '../analysis/protocol';
import { runAnalysis } from '../analysis/run-analysis';
import { handleApplyScoring } from './apply-scoring';
import { dbName, openDb } from './db';
import { runOpenSnapshot } from './open-snapshot';
import { handleSave } from './save-snapshot';

afterEach(async () => {
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = request.onerror = resolve;
  });
});

// Eight synthetic customers with different totals, two orders each.
const csv = [
  'Order,Customer ID,Date,Total',
  ...Array.from({ length: 8 }, (_, i) => [
    `#1${i},C${i},2026-0${i + 1}-03,${(i + 1) * 40}.00`,
    `#2${i},C${i},2026-0${i + 2}-04,${(i + 1) * 10}.00`,
  ]).flat(),
].join('\n');
const plan: AnalysisPlan = {
  mapping: { orderId: 0, customerId: 1, orderedAt: 2, amount: 3 },
  read: { decimal: '.', dateOrder: 'dmy' },
  amountLevel: 'order',
};
const own: ScoringMethods = {
  r: { method: 'quantile' },
  f: { method: 'fixed', breaks: [1, 2, 3, 5] },
  m: { method: 'fixed', breaks: [100, 150, 200, 300] },
};
const apply = (analysis: Parameters<typeof handleApplyScoring>[0], scoring = own) =>
  handleApplyScoring(analysis, {
    type: 'apply-scoring',
    requestId: 7,
    scoring,
    map: defaultSegmentMap,
  });

async function saved() {
  const analysis = await runAnalysis(csv, plan, () => {});
  if (!analysis) throw new Error('analysis failed');
  const target = { projectName: 'Shop', sourceFileName: 'orders.csv', map: defaultSegmentMap };
  const reply = await handleSave(analysis, { type: 'save', requestId: 1, target });
  if (!reply.result.ok) throw new Error('save failed');
  return analysis;
}

async function stored() {
  const db = await openDb();
  const all = {
    projects: await db.getAll('projects'),
    snapshots: await db.getAll('snapshots'),
    customers: await db.getAll('customerScores'),
  };
  db.close();
  return all;
}

describe('handleApplyScoring (U5)', () => {
  it('updates the saved analysis in place: same snapshot, new thresholds and scores', async () => {
    const analysis = await saved();
    const reply = await apply(analysis);
    if (reply.type !== 'scoring-applied') throw new Error(JSON.stringify(reply));
    expect(reply.saved).toMatchObject({ ok: true });
    expect(reply.breakpoints.m).toEqual([100, 150, 200, 300]);

    const { projects, snapshots, customers } = await stored();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.frozenConfig.scoring).toEqual(own);
    expect(snapshots[0]?.breakpoints.m).toEqual([100, 150, 200, 300]);
    expect(projects[0]?.scoringConfig).toEqual(own);
    expect(customers).toHaveLength(8);
    // C0 spent 50 in total: up to 100 scores M1. C7 spent 400: over 300 scores M5.
    expect(customers.find((c) => c.customerKey === 'C0')?.m).toBe(1);
    expect(customers.find((c) => c.customerKey === 'C7')?.m).toBe(5);
  });

  it('updates a saved analysis that was opened again later', async () => {
    await saved();
    const { snapshots } = await stored();
    const opened = await runOpenSnapshot(snapshots[0]?.id ?? '', defaultSegmentMap, () => {});
    const reply = await apply(opened);
    expect(reply).toMatchObject({ type: 'scoring-applied', saved: { ok: true } });
    expect((await stored()).snapshots[0]?.frozenConfig.scoring).toEqual(own);
  });

  it('only re-scores an analysis that is not saved, such as the sample', async () => {
    const analysis = await runAnalysis(csv, plan, () => {});
    const reply = await apply(analysis);
    expect(reply).toMatchObject({ type: 'scoring-applied', saved: null });
    expect(analysis?.meta?.scoring).toEqual(own);
    expect((await stored()).snapshots).toHaveLength(0);
  });

  it('refuses unusable thresholds and changes nothing saved', async () => {
    const analysis = await saved();
    const before = await stored();
    const bad: ScoringMethods = { ...own, m: { method: 'fixed', breaks: [300, 200, 150, 100] } };
    const reply = await apply(analysis, bad);
    expect(reply).toMatchObject({ type: 'error', requestId: 7 });
    expect(await stored()).toEqual(before);
  });
});
