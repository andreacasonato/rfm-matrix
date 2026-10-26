// The app's IndexedDB database. Opening it runs every migration the browser has not run yet,
// in order, inside IndexedDB's version upgrade (SCHEMA.md "Migrations and operations").
import { type IDBPDatabase, openDB } from 'idb';
import { migration001 } from './migrations/001-initial';
import type { RfmDb } from './schema';

export const dbName = 'rfm-matrix';

const migrations = [migration001];
export const dbVersion = migrations.length;

export function openDb(): Promise<IDBPDatabase<RfmDb>> {
  return openDB<RfmDb>(dbName, dbVersion, {
    upgrade(db, oldVersion) {
      for (const migrate of migrations.slice(oldVersion)) migrate(db);
    },
  });
}
