// App preferences on this device (SCHEMA.md "settings"): for now, whether the first-upload
// questions were answered (S11). Reading never creates the database.
import { dbExists, openDb } from './db';
import type { SettingsRecord } from './schema';

const fresh: SettingsRecord = { onboardingDone: false };

export async function readSettings(): Promise<SettingsRecord> {
  if (!(await dbExists())) return fresh;
  const db = await openDb();
  try {
    return (await db.get('settings', 'app')) ?? fresh;
  } finally {
    db.close();
  }
}

export async function markOnboardingDone(): Promise<void> {
  const db = await openDb();
  try {
    const current = (await db.get('settings', 'app')) ?? fresh;
    await db.put('settings', { ...current, onboardingDone: true }, 'app');
  } finally {
    db.close();
  }
}
