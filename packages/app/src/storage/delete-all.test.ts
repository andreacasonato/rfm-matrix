import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { dbName, openDb } from './db';
import { deleteAllData } from './delete-all';
import { listProjects } from './projects';

describe('Delete all data (APP_FLOW, SCHEMA.md)', () => {
  it('deletes the whole database and leaves none behind', async () => {
    const db = await openDb();
    await db.put('settings', { onboardingDone: true }, 'app');
    db.close();
    expect((await indexedDB.databases()).map((d) => d.name)).toContain(dbName);
    await deleteAllData();
    expect((await indexedDB.databases()).map((d) => d.name)).not.toContain(dbName);
  });

  // Regression: listing projects after a delete opened, and so re-created, the database.
  it('is not re-created by listing projects afterwards', async () => {
    const db = await openDb();
    db.close();
    await deleteAllData();
    expect(await listProjects()).toEqual([]);
    expect((await indexedDB.databases()).map((d) => d.name)).not.toContain(dbName);
  });

  it('reports a delete held up by another open tab', async () => {
    const blocked = {
      onsuccess: null,
      onerror: null,
      onblocked: null,
    } as unknown as IDBOpenDBRequest;
    const factory = { deleteDatabase: () => blocked } as unknown as IDBFactory;
    let seen = false;
    const done = deleteAllData({ factory, onBlocked: () => (seen = true) });
    blocked.onblocked?.(new Event('blocked') as IDBVersionChangeEvent);
    blocked.onsuccess?.(new Event('success'));
    await done;
    expect(seen).toBe(true);
  });
});
