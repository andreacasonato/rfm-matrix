// Migration 001 (SCHEMA.md): the five stores. Released migrations are never edited; a change
// is a new numbered file (AGENTS.md).
import type { IDBPDatabase } from 'idb';
import type { RfmDb } from '../schema';

export function migration001(db: IDBPDatabase<RfmDb>): void {
  db.createObjectStore('projects', { keyPath: 'id' }).createIndex('updatedAt', 'updatedAt');
  db.createObjectStore('segmentMaps', { keyPath: 'id' }).createIndex('projectId', 'projectId');
  db.createObjectStore('snapshots', { keyPath: 'id' }).createIndex('projectId_createdAt', [
    'projectId',
    'createdAt',
  ]);
  db.createObjectStore('customerScores', {
    keyPath: ['snapshotId', 'customerKey'],
  }).createIndex('snapshotId_segmentId', ['snapshotId', 'segmentId']);
  db.createObjectStore('settings');
}
