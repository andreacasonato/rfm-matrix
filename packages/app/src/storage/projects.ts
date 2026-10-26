// The projects saved on this device, read from the page (Start, Project and data) (S8).
import type { SegmentMap } from '@rfm-matrix/core';
import { openDb } from './db';
import type { ProjectRecord, SegmentMapRecord, SnapshotRecord } from './schema';

export type SnapshotSummary = Pick<
  SnapshotRecord,
  'id' | 'createdAt' | 'sourceFileName' | 'analysisDate' | 'customerCount'
>;
export type ProjectSummary = {
  id: string;
  name: string;
  updatedAt: number;
  snapshots: number;
  latest?: SnapshotSummary;
};
export type LoadedProject = {
  project: ProjectRecord;
  map: SegmentMap;
  snapshots: SnapshotSummary[];
};

const summary = (s: SnapshotRecord): SnapshotSummary => ({
  id: s.id,
  createdAt: s.createdAt,
  sourceFileName: s.sourceFileName,
  analysisDate: s.analysisDate,
  customerCount: s.customerCount,
});

const asMap = ({ segments, cells }: SegmentMapRecord): SegmentMap => ({ segments, cells });

const ofProject = (id: string) => IDBKeyRange.bound([id, -Infinity], [id, Infinity]);

/** Snapshots oldest first. */
async function snapshotsOf(db: Awaited<ReturnType<typeof openDb>>, projectId: string) {
  const records = await db.getAllFromIndex(
    'snapshots',
    'projectId_createdAt',
    ofProject(projectId),
  );
  return records.map(summary);
}

/** Newest first. */
export async function listProjects(): Promise<ProjectSummary[]> {
  const db = await openDb();
  try {
    const projects = (await db.getAllFromIndex('projects', 'updatedAt')).reverse();
    return Promise.all(
      projects.map(async (p) => {
        const snapshots = await snapshotsOf(db, p.id);
        const latest = snapshots.at(-1);
        return {
          id: p.id,
          name: p.name,
          updatedAt: p.updatedAt,
          snapshots: snapshots.length,
          ...(latest ? { latest } : {}),
        };
      }),
    );
  } finally {
    db.close();
  }
}

export async function loadProject(id: string): Promise<LoadedProject | undefined> {
  const db = await openDb();
  try {
    const project = await db.get('projects', id);
    const map = await db.getFromIndex('segmentMaps', 'projectId', id);
    if (!project || !map) return undefined;
    return { project, map: asMap(map), snapshots: await snapshotsOf(db, id) };
  } finally {
    db.close();
  }
}

/** Keeps edited rules for the project's next analyses; saved snapshots keep their own. */
export async function saveProjectMap(projectId: string, map: SegmentMap): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(['segmentMaps', 'projects'], 'readwrite');
    const record = await tx.objectStore('segmentMaps').index('projectId').get(projectId);
    const project = await tx.objectStore('projects').get(projectId);
    if (!record || !project) throw new Error('This project is no longer on this device.');
    const time = Date.now();
    await tx.objectStore('segmentMaps').put({ ...record, ...map, updatedAt: time });
    await tx.objectStore('projects').put({ ...project, updatedAt: time });
    await tx.done;
  } finally {
    db.close();
  }
}
