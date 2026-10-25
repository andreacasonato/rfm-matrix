// Checks whether this browser lets the app keep data (IndexedDB), so the Start screen can warn
// before work is lost. Private windows and strict settings often block it.

export type StorageState = 'checking' | 'available' | 'unavailable';

const probeName = 'rfm-matrix-probe';

export function probeStorage(): Promise<Exclude<StorageState, 'checking'>> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(probeName);
      request.onsuccess = () => {
        request.result.close();
        indexedDB.deleteDatabase(probeName);
        resolve('available');
      };
      request.onerror = () => resolve('unavailable');
    } catch {
      resolve('unavailable');
    }
  });
}
