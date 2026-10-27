import 'fake-indexeddb/auto';
import { defaultSegmentMap, notInEarlier, notInLater } from '@rfm-matrix/core';
import Papa from 'papaparse';
import { afterEach, describe, expect, it } from 'vitest';
import type { AnalysisPlan } from '../analysis/protocol';
import { runAnalysis } from '../analysis/run-analysis';
import { dbName } from './db';
import { exportMovers, runMovement } from './movement';
import { loadProject } from './projects';
import { handleSave } from './save-snapshot';

afterEach(async () => {
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = request.onerror = resolve;
  });
});

const plan: AnalysisPlan = {
  mapping: { orderId: 0, customerId: 1, orderedAt: 2, amount: 3 },
  read: { decimal: '.', dateOrder: 'dmy' },
  amountLevel: 'order',
};
// Six customers in September; in October "=cmd" and C2 buy again, C6 is gone and C7 is new.
const september = [
  'Order,Customer ID,Date,Total',
  '#1,=cmd,2026-01-05,10.00',
  '#2,C2,2026-02-05,20.00',
  '#3,C3,2026-03-05,30.00',
  '#4,C4,2026-04-05,40.00',
  '#5,C5,2026-05-05,50.00',
  '#6,C6,2026-06-05,60.00',
];
const october = [
  ...september.filter((row) => !row.includes('C6')),
  '#7,=cmd,2026-09-20,15.00',
  '#8,C2,2026-09-21,25.00',
  '#9,C7,2026-09-22,70.00',
];

async function twoSnapshots() {
  let projectId: string | undefined;
  for (const [name, rows] of [
    ['sep.csv', september],
    ['oct.csv', october],
  ] as const) {
    const analysis = await runAnalysis(rows.join('\n'), plan, () => {});
    const target = {
      ...(projectId ? { projectId } : {}),
      projectName: 'shop',
      sourceFileName: name,
      map: defaultSegmentMap,
    };
    const { result } = await handleSave(analysis, { type: 'save', requestId: 1, target });
    if (!result.ok) throw new Error(result.message);
    projectId = result.projectId;
  }
  const project = await loadProject(projectId ?? '');
  const [earlier, later] = project?.snapshots ?? [];
  if (!earlier || !later) throw new Error('two snapshots expected');
  return { earlier: earlier.id, later: later.id };
}

describe('movement between saved analyses (S10)', () => {
  it('compares two saved snapshots', async () => {
    const { earlier, later } = await twoSnapshots();
    const { totals, flows } = await runMovement(earlier, later, defaultSegmentMap);
    expect(totals).toMatchObject({ newCustomers: 1, gone: 1 });
    expect(totals.stayed + totals.moved).toBe(5);
    expect(flows.find((f) => f.from === notInEarlier)?.customers).toBe(1);
    expect(flows.find((f) => f.to === notInLater)?.customers).toBe(1);
  });

  it('exports the customers of one flow, with both segments, safely', async () => {
    const { earlier, later } = await twoSnapshots();
    const { flows } = await runMovement(earlier, later, defaultSegmentMap);
    const moved = flows.find((f) => f.from !== notInEarlier && f.to !== notInLater);
    if (!moved) throw new Error('expected a move');
    const out = await exportMovers(earlier, later, defaultSegmentMap, moved.from, moved.to);
    const rows = Papa.parse<string[]>((await out.file.text()).replace(/^﻿/, ''), {
      skipEmptyLines: true,
    }).data;
    expect(rows[0]).toEqual([
      'Customer ID',
      'Earlier segment',
      'Later segment',
      'Recency (days)',
      'Orders',
      'Spend',
      'R',
      'F',
      'M',
    ]);
    expect(out.rows).toBe(moved.customers);
    expect(rows).toHaveLength(moved.customers + 1);
    expect(out.name).toMatch(/^movers-[a-z-]+-to-[a-z-]+-\d{4}-\d{2}-\d{2}\.csv$/);
  });

  it('exports customers no longer in the later analysis with their earlier scores', async () => {
    const { earlier, later } = await twoSnapshots();
    const { flows } = await runMovement(earlier, later, defaultSegmentMap);
    const gone = flows.find((f) => f.to === notInLater);
    if (!gone) throw new Error('expected a gone customer');
    const out = await exportMovers(earlier, later, defaultSegmentMap, gone.from, gone.to);
    const text = await out.file.text();
    expect(text).toContain('C6');
    expect(text).toContain('Not in later analysis');
  });

  it('escapes a formula-like customer ID in every flow it appears in (ADR-0014)', async () => {
    const { earlier, later } = await twoSnapshots();
    const { flows } = await runMovement(earlier, later, defaultSegmentMap);
    const texts = await Promise.all(
      flows.map(async (f) =>
        (await exportMovers(earlier, later, defaultSegmentMap, f.from, f.to)).file.text(),
      ),
    );
    const all = texts.join('\n');
    expect(all).toContain("'=cmd");
    expect(all).not.toMatch(/(^|,)=cmd/m);
  });
});
