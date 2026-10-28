// Save project file and Open project file (S9): a saved project with its rules and every
// snapshot, as one compressed file. Opening checks the whole file in core first and always adds
// a new project, so nothing already on this device is overwritten.
import {
  type CustomerColumns,
  defaultSegmentMap,
  type ProjectFile,
  type ProjectFileSnapshot,
  projectFileToJson,
  readProjectFile,
  type SegmentMap,
} from '@rfm-matrix/core';
import { GzipReadError, gunzipText, gzipText } from '@rfm-matrix/io';
import { putInBatches } from './customer-writes';
import { openDb } from './db';
import { schemaVersion } from './save-snapshot';
import type { CustomerScoreRecord, SnapshotRecord } from './schema';

// biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are unsafe in file names.
const unsafeInFileNames = /[\\/:*?"<>|\u0000-\u001f]/g;

/** The project's name as a file name every system accepts. */
export const projectFileName = (name: string) =>
  `${name.replace(unsafeInFileNames, '-').trim() || 'project'}.rfmproject`;

function columnsOf(records: CustomerScoreRecord[], withEmail: boolean): CustomerColumns {
  const pick = <K extends keyof CustomerScoreRecord>(key: K) => records.map((c) => c[key]);
  return {
    customerKey: pick('customerKey'),
    email: withEmail ? records.map((c) => c.email ?? null) : null,
    firstOrderAt: pick('firstOrderAt'),
    lastOrderAt: pick('lastOrderAt'),
    recencyDays: pick('recencyDays'),
    frequency: pick('frequency'),
    monetaryMinor: pick('monetaryMinor'),
    r: pick('r'),
    f: pick('f'),
    m: pick('m'),
    segmentId: pick('segmentId'),
  };
}

export type SavedProjectFile = { file: Blob; name: string; hasEmail: boolean };

export async function exportProject(projectId: string): Promise<SavedProjectFile> {
  const db = await openDb();
  try {
    const project = await db.get('projects', projectId);
    const map = await db.getFromIndex('segmentMaps', 'projectId', projectId);
    if (!project || !map) throw new Error('This project is no longer on this device.');
    const range = IDBKeyRange.bound([projectId, -Infinity], [projectId, Infinity]);
    const records = await db.getAllFromIndex('snapshots', 'projectId_createdAt', range);
    const hasEmail = project.columnMapping.columns.email !== undefined;
    const snapshots: ProjectFileSnapshot[] = [];
    for (const s of records) {
      const customers = await db.getAll('customerScores', IDBKeyRange.bound([s.id], [s.id, []]));
      const withEmail = s.frozenConfig.mapping.columns.email !== undefined;
      snapshots.push({
        createdAt: s.createdAt,
        sourceFileName: s.sourceFileName,
        sourceFileHash: s.sourceFileHash,
        analysisDate: s.analysisDate,
        config: s.frozenConfig,
        cells: s.frozenMap.cells,
        breakpoints: s.breakpoints,
        rowCounts: s.rowCounts,
        report: s.report,
        customers: columnsOf(customers, withEmail),
      });
    }
    const file: ProjectFile = {
      name: project.name,
      createdAt: project.createdAt,
      mapping: project.columnMapping,
      ...(project.cleaningRules ? { cleaning: project.cleaningRules } : {}),
      ...(project.scoringConfig ? { scoring: project.scoringConfig } : {}),
      cells: map.cells,
      snapshots,
    };
    const name = projectFileName(project.name);
    return { file: await gzipText(projectFileToJson(file)), name, hasEmail };
  } finally {
    db.close();
  }
}

export type OpenedProjectFile =
  | { ok: true; projectId: string; latestSnapshotId: string | undefined }
  | { ok: false; problems: string[] };

const gzipProblems: Record<GzipReadError['kind'], string> = {
  'not-gzip': 'This is not a project file saved by RFM Matrix.',
  'too-large': 'This project file is too large to open in the browser.',
  damaged: 'This project file is damaged and cannot be read.',
};

async function readFile(file: Blob, base: SegmentMap) {
  let text: string;
  try {
    text = await gunzipText(file);
  } catch (error) {
    if (error instanceof GzipReadError)
      return { ok: false as const, problems: [gzipProblems[error.kind]] };
    throw error;
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false as const,
      problems: ['This project file is damaged: it is not valid JSON.'],
    };
  }
  return readProjectFile(data, base);
}

export async function importProject(
  file: Blob,
  { base = defaultSegmentMap, newId = () => crypto.randomUUID(), now = Date.now } = {},
): Promise<OpenedProjectFile> {
  const result = await readFile(file, base);
  if (!result.ok) return result;
  const { project } = result;
  const projectId = newId();
  const time = now();
  const db = await openDb();
  try {
    const tx = db.transaction(
      ['projects', 'segmentMaps', 'snapshots', 'customerScores'],
      'readwrite',
    );
    await tx.objectStore('projects').put({
      id: projectId,
      name: project.name,
      schemaVersion,
      columnMapping: project.mapping,
      ...(project.cleaning ? { cleaningRules: project.cleaning } : {}),
      ...(project.scoring ? { scoringConfig: project.scoring } : {}),
      createdAt: project.createdAt,
      updatedAt: time,
    });
    await tx.objectStore('segmentMaps').put({
      segments: base.segments,
      cells: project.cells,
      id: newId(),
      projectId,
      updatedAt: time,
    });
    let latest: string | undefined;
    for (const s of project.snapshots) {
      latest = newId();
      const record: SnapshotRecord = {
        id: latest,
        projectId,
        createdAt: s.createdAt,
        sourceFileName: s.sourceFileName,
        sourceFileHash: s.sourceFileHash,
        analysisDate: s.analysisDate,
        frozenConfig: s.config,
        frozenMap: { segments: base.segments, cells: s.cells },
        breakpoints: s.breakpoints,
        rowCounts: s.rowCounts,
        customerCount: s.customers.customerKey.length,
        report: s.report,
      };
      await tx.objectStore('snapshots').put(record);
      const id = latest;
      await putInBatches(tx.objectStore('customerScores'), s.customers.customerKey.length, (i) =>
        customerAt(id, s.customers, i),
      );
    }
    await tx.done;
    return { ok: true, projectId, latestSnapshotId: latest };
  } finally {
    db.close();
  }
}

/** A checked customer, by position in the file's columns. */
function customerAt(snapshotId: string, c: CustomerColumns, i: number): CustomerScoreRecord {
  const email = c.email?.[i];
  return {
    snapshotId,
    customerKey: c.customerKey[i] ?? '',
    ...(email ? { email } : {}),
    firstOrderAt: c.firstOrderAt[i] ?? 0,
    lastOrderAt: c.lastOrderAt[i] ?? 0,
    recencyDays: c.recencyDays[i] ?? 0,
    frequency: c.frequency[i] ?? 0,
    monetaryMinor: c.monetaryMinor[i] ?? 0,
    r: c.r[i] ?? 1,
    f: c.f[i] ?? 1,
    m: c.m[i] ?? 1,
    segmentId: c.segmentId[i] ?? '',
  };
}
