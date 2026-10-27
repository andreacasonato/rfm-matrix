import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { dbName } from './db';
import { markOnboardingDone, readSettings } from './settings';

afterEach(async () => {
  await new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(dbName);
    request.onsuccess = request.onerror = resolve;
  });
});

describe('app settings (SCHEMA.md "settings")', () => {
  it('starts with onboarding not done, without creating the database', async () => {
    expect(await readSettings()).toEqual({ onboardingDone: false });
    expect((await indexedDB.databases()).map((d) => d.name)).not.toContain(dbName);
  });

  it('remembers that the first-upload questions were answered', async () => {
    await markOnboardingDone();
    expect(await readSettings()).toEqual({ onboardingDone: true });
  });
});
