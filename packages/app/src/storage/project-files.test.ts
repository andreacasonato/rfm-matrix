import 'fake-indexeddb/auto';
import { defaultSegmentMap, setCell } from '@rfm-matrix/core';
import { gzipText } from '@rfm-matrix/io';
import { afterEach, describe, expect, it } from 'vitest';
import type { AnalysisPlan } from '../analysis/protocol';
import { runAnalysis } from '../analysis/run-analysis';
import { dbName, openDb } from './db';
import { deleteAllData } from './delete-all';
import { exportProject, importProject, projectFileName } from './project-files';
import { listProjects, saveProjectMap } from './projects';
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
    { length: 14 },
    (_, i) => `#${i},C${i % 7},c${i % 7}@example.test,2026-0${(i % 9) + 1}-04,${7 + i}.25`,
  ),
].join('\n');
const plan: AnalysisPlan = {
  mapping: { orderId: 0, customerId: 1, email: 2, orderedAt: 3, amount: 4 },
  columnNames: {
    orderId: 'Order',
    customerId: 'Customer ID',
    email: 'Email',
    orderedAt: 'Date',
    amount: 'Total',
  },
  read: { decimal: '.', dateOrder: 'dmy' },
  amountLevel: 'order',
};

async function savedProject() {
  let projectId: string | undefined;
  for (const sourceFileName of ['sep.csv', 'oct.csv']) {
    const analysis = await runAnalysis(csv, plan, () => {});
    const target = {
      ...(projectId ? { projectId } : {}),
      projectName: 'my-shop',
      sourceFileName,
      map: defaultSegmentMap,
    };
    const { result } = await handleSave(analysis, { type: 'save', requestId: 1, target });
    if (!result.ok) throw new Error(result.message);
    projectId = result.projectId;
  }
  if (!projectId) throw new Error('not saved');
  await saveProjectMap(
    projectId,
    setCell(defaultSegmentMap, { r: 1, f: 1, m: 'all' }, 'hibernating'),
  );
  return projectId;
}

/** Every stored customer record without its snapshot ID, for comparing across devices. */
async function storedCustomers() {
  const db = await openDb();
  const all = await db.getAll('customerScores');
  db.close();
  return all
    .map(({ snapshotId: _id, ...rest }) => rest)
    .sort((a, b) =>
      `${a.customerKey}${a.lastOrderAt}`.localeCompare(`${b.customerKey}${b.lastOrderAt}`),
    );
}

describe('project files (S9, PRD story 9)', () => {
  it('saves a project and reopens it on a fresh device with everything restored', async () => {
    const projectId = await savedProject();
    const before = await storedCustomers();
    const saved = await exportProject(projectId);
    expect(saved.name).toBe('my-shop.rfmproject');
    expect(saved.hasEmail).toBe(true);

    await deleteAllData();
    const opened = await importProject(saved.file);
    if (!opened.ok) throw new Error(opened.problems.join(' '));
    const [project] = await listProjects();
    expect(project).toMatchObject({ id: opened.projectId, name: 'my-shop', snapshots: 2 });
    expect(project?.latest?.sourceFileName).toBe('oct.csv');
    expect(opened.latestSnapshotId).toBe(project?.latest?.id);
    expect(await storedCustomers()).toEqual(before);

    const db = await openDb();
    const [map] = await db.getAll('segmentMaps');
    const [record] = await db.getAll('projects');
    db.close();
    expect(map?.cells.slice(0, 5)).toEqual(Array(5).fill('hibernating'));
    expect(record?.columnMapping.columnNames).toEqual(plan.columnNames);
  });

  it('opens the same file twice as two projects, overwriting nothing', async () => {
    const saved = await exportProject(await savedProject());
    await importProject(saved.file);
    expect(await listProjects()).toHaveLength(2);
  });

  it.each([
    [
      'a file that is not gzip',
      async () => new Blob(['{"format":"rfm-matrix-project"}']),
      'This is not a project file saved by RFM Matrix.',
    ],
    [
      'gzip that is not JSON',
      () => gzipText('not json'),
      'This project file is damaged: it is not valid JSON.',
    ],
    [
      'another JSON file',
      () => gzipText('{"name":"x"}'),
      'This is not an RFM Matrix project file.',
    ],
  ])('refuses %s with a plain message and saves nothing', async (_name, make, problem) => {
    const opened = await importProject(await make());
    expect(opened).toEqual({ ok: false, problems: [problem] });
    expect(await listProjects()).toEqual([]);
  });

  it('names the file after the project, without characters systems refuse', () => {
    expect(projectFileName('Shop: EU/UK "2026"')).toBe('Shop- EU-UK -2026-.rfmproject');
    expect(projectFileName('  ')).toBe('project.rfmproject');
  });
});
