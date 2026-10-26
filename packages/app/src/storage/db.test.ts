import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { dbName, dbVersion, openDb } from './db';

afterEach(async () => {
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = request.onerror = resolve;
  });
});

describe('migration 001 (SCHEMA.md)', () => {
  it('creates the five stores with the keys and indexes in SCHEMA.md', async () => {
    const db = await openDb();
    expect(db.version).toBe(dbVersion);
    expect([...db.objectStoreNames].sort()).toEqual([
      'customerScores',
      'projects',
      'segmentMaps',
      'settings',
      'snapshots',
    ]);
    const tx = db.transaction([...db.objectStoreNames], 'readonly');
    const shape = (name: (typeof db.objectStoreNames)[number]) => {
      const store = tx.objectStore(name);
      return {
        keyPath: store.keyPath,
        indexes: [...store.indexNames].map((index) => [index, store.index(index).keyPath]),
      };
    };
    expect(shape('projects')).toEqual({ keyPath: 'id', indexes: [['updatedAt', 'updatedAt']] });
    expect(shape('segmentMaps')).toEqual({ keyPath: 'id', indexes: [['projectId', 'projectId']] });
    expect(shape('snapshots')).toEqual({
      keyPath: 'id',
      indexes: [['projectId_createdAt', ['projectId', 'createdAt']]],
    });
    expect(shape('customerScores')).toEqual({
      keyPath: ['snapshotId', 'customerKey'],
      indexes: [['snapshotId_segmentId', ['snapshotId', 'segmentId']]],
    });
    expect(shape('settings')).toEqual({ keyPath: null, indexes: [] });
    db.close();
  });

  it('keeps existing data when the database is opened again', async () => {
    const first = await openDb();
    await first.put('settings', { lastProjectId: 'p1', onboardingDone: true }, 'app');
    first.close();
    const again = await openDb();
    expect(await again.get('settings', 'app')).toEqual({
      lastProjectId: 'p1',
      onboardingDone: true,
    });
    again.close();
  });
});
