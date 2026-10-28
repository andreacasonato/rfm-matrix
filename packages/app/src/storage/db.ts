// The app's IndexedDB database. Opening it runs every migration the browser has not run yet,
// in order, inside IndexedDB's version upgrade (SCHEMA.md "Migrations and operations").
import { type IDBPDatabase, openDB } from 'idb';
import { migration001 } from './migrations/001-initial';
import type { RfmDb } from './schema';

export const dbName = 'rfm-matrix';

const migrations = [migration001];
export const dbVersion = migrations.length;

/** Whether the database exists, so reading never creates it (e.g. after Delete all data). */
export async function dbExists(): Promise<boolean> {
  // Browsers without databases() cannot tell; opening then is harmless, as it creates no data.
  if (typeof indexedDB.databases !== 'function') return true;
  return (await indexedDB.databases()).some((d) => d.name === dbName);
}

export function openDb(): Promise<IDBPDatabase<RfmDb>> {
  return openDB<RfmDb>(dbName, dbVersion, {
    upgrade(db, oldVersion) {
      for (const migrate of migrations.slice(oldVersion)) migrate(db);
    },
  });
}
