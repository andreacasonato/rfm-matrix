// "Delete all data deletes the whole database on that device" (SCHEMA.md). Another tab with the
// app open holds the database, so the browser waits for it to close; `onBlocked` says so.
import { dbName } from './db';

type Options = { factory?: IDBFactory; onBlocked?(): void };

export function deleteAllData({ factory = indexedDB, onBlocked = () => {} }: Options = {}) {
  return new Promise<void>((resolve, reject) => {
    const request = factory.deleteDatabase(dbName);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => onBlocked();
  });
}
