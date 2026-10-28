import 'fake-indexeddb/auto';
import { defaultSegmentMap, setCell } from '@rfm-matrix/core';
import { afterEach, describe, expect, it } from 'vitest';
import type { AnalysisPlan } from '../analysis/protocol';
import { runAnalysis } from '../analysis/run-analysis';
import { dbName, openDb } from './db';
import { handleSave, saveFailure } from './save-snapshot';

afterEach(async () => {
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = request.onerror = resolve;
  });
});

// Synthetic people only. Names, addresses and phones must never reach storage (SCHEMA.md).
const header = 'Order,Customer ID,Email,Date,Total,Billing Name,Billing Address1,Phone';
const people = [
  ['C1', 'ada@example.test', 'Ada Quill', '12 Hidden Lane', '+44 7700 900101'],
  ['C2', 'bo@example.test', 'Bo Fenwick', '3 Secret Row', '+44 7700 900102'],
  ['C3', 'cy@example.test', 'Cy Marsh', '77 Quiet Close', '+44 7700 900103'],
  ['C4', 'di@example.test', 'Di Holt', '5 Private Way', '+44 7700 900104'],
  ['C5', 'ed@example.test', 'Ed Wren', '9 Unlisted Road', '+44 7700 900105'],
];
const csv = [
  header,
  ...people.flatMap(([id, email, name, address, phone], i) => [
    `#10${i},${id},${email},2026-0${i + 1}-03,${10 + i}.50,${name},"${address}",${phone}`,
    `#20${i},${id},${email},2026-0${i + 2}-04,${20 + i}.25,${name},"${address}",${phone}`,
  ]),
].join('\n');
const plan: AnalysisPlan = {
  mapping: { orderId: 0, customerId: 1, email: 2, orderedAt: 3, amount: 4 },
  read: { decimal: '.', dateOrder: 'dmy' },
  amountLevel: 'order',
};

async function analyse(withPlan = plan) {
  const analysis = await runAnalysis(csv, withPlan, () => {});
  if (!analysis) throw new Error('analysis failed');
  return analysis;
}

async function everything() {
  const db = await openDb();
  const all = {
    projects: await db.getAll('projects'),
    segmentMaps: await db.getAll('segmentMaps'),
    snapshots: await db.getAll('snapshots'),
    customerScores: await db.getAll('customerScores'),
    settings: await db.getAll('settings'),
  };
  db.close();
  return all;
}

const target = { projectName: 'My shop', sourceFileName: 'orders.csv', map: defaultSegmentMap };
const save = (analysis: Awaited<ReturnType<typeof analyse>>, extra = {}) =>
  handleSave(analysis, { type: 'save', requestId: 1, target: { ...target, ...extra } });

describe('saving an analysis on this device (S8)', () => {
  it('stores a project, its rules, one snapshot and one record per customer', async () => {
    const analysis = await analyse();
    const reply = await save(analysis);
    if (!reply.result.ok) throw new Error(reply.result.message);
    const stored = await everything();
    expect(stored.projects).toHaveLength(1);
    expect(stored.projects[0]).toMatchObject({ id: reply.result.projectId, name: 'My shop' });
    expect(stored.segmentMaps[0]?.cells).toEqual(defaultSegmentMap.cells);
    expect(stored.snapshots[0]).toMatchObject({
      id: reply.result.snapshotId,
      sourceFileName: 'orders.csv',
      customerCount: 5,
      rowCounts: { read: 10, used: 10 },
    });
    expect(stored.snapshots[0]?.sourceFileHash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored.customerScores).toHaveLength(5);
    const ada = stored.customerScores.find((c) => c.customerKey === 'C1');
    expect(ada).toMatchObject({
      email: 'ada@example.test',
      frequency: 2,
      monetaryMinor: 3075,
      firstOrderAt: Date.parse('2026-01-03T00:00:00Z'),
      lastOrderAt: Date.parse('2026-02-04T00:00:00Z'),
    });
  });

  it('writes every customer when the records go in several batches', async () => {
    const reply = await handleSave(
      await analyse(),
      { type: 'save', requestId: 1, target },
      { batchSize: 2 },
    );
    expect(reply.result.ok).toBe(true);
    const { customerScores } = await everything();
    expect(customerScores.map((c) => c.customerKey).sort()).toEqual(['C1', 'C2', 'C3', 'C4', 'C5']);
  });

  it('never stores names, addresses, phone numbers or raw order rows', async () => {
    await save(await analyse());
    const text = JSON.stringify(await everything());
    for (const [, , name, address, phone] of people) {
      for (const value of [name, address, phone]) expect(text).not.toContain(value);
    }
    expect(text).not.toContain('#100');
    expect(text).not.toContain('Billing');
  });

  it('stores no email when no email column was mapped', async () => {
    const { email: _email, ...withoutEmail } = plan.mapping;
    await save(await analyse({ ...plan, mapping: withoutEmail }));
    const { customerScores } = await everything();
    expect(customerScores.every((c) => !('email' in c))).toBe(true);
  });

  it('adds later analyses to the same project, with the rules they used', async () => {
    const first = await save(await analyse());
    if (!first.result.ok) throw new Error(first.result.message);
    const edited = setCell(defaultSegmentMap, { r: 5, f: 2, m: 'all' }, 'champions');
    const second = await save(await analyse(), { projectId: first.result.projectId, map: edited });
    if (!second.result.ok) throw new Error(second.result.message);
    const stored = await everything();
    expect(stored.projects).toHaveLength(1);
    expect(stored.snapshots).toHaveLength(2);
    expect(stored.segmentMaps).toHaveLength(1);
    expect(stored.segmentMaps[0]?.cells).toEqual(edited.cells);
    const { snapshotId } = second.result;
    const latest = stored.snapshots.find((s) => s.id === snapshotId);
    expect(latest?.frozenMap.cells).toEqual(edited.cells);
  });

  it('refuses a project that is not on this device', async () => {
    const reply = await save(await analyse(), { projectId: 'gone' });
    expect(reply.result).toMatchObject({ ok: false, storageFull: false });
  });

  it('tells a full disk apart from other failures', () => {
    expect(saveFailure(new DOMException('full', 'QuotaExceededError'))).toMatchObject({
      ok: false,
      storageFull: true,
    });
    expect(saveFailure(new Error('boom'))).toEqual({
      ok: false,
      storageFull: false,
      message: 'boom',
    });
  });
});
