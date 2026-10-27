// Movement between two saved analyses (S10), in the worker: both snapshots are read from the
// device, compared under the same rules by core, and the customers of one flow exported.
import {
  compareSnapshots,
  type Movement,
  notInEarlier,
  notInLater,
  type Score,
  type SegmentMap,
  segmentFor,
} from '@rfm-matrix/core';
import { type CsvValue, toCsv } from '@rfm-matrix/io';
import { openDb } from './db';
import type { CustomerScoreRecord } from './schema';

async function recordsOf(snapshotId: string): Promise<CustomerScoreRecord[]> {
  const db = await openDb();
  try {
    if (!(await db.get('snapshots', snapshotId))) {
      throw new Error('This saved analysis is no longer on this device.');
    }
    return await db.getAll('customerScores', IDBKeyRange.bound([snapshotId], [snapshotId, []]));
  } finally {
    db.close();
  }
}

const asScores = (records: CustomerScoreRecord[]) => ({
  customerKey: records.map((c) => c.customerKey),
  r: records.map((c) => c.r),
  f: records.map((c) => c.f),
  m: records.map((c) => c.m),
});

export async function runMovement(
  earlierId: string,
  laterId: string,
  map: SegmentMap,
): Promise<Movement> {
  const [earlier, later] = await Promise.all([recordsOf(earlierId), recordsOf(laterId)]);
  return compareSnapshots(asScores(earlier), asScores(later), map);
}

const outsideNames: Record<string, string> = {
  [notInEarlier]: 'Not in earlier analysis',
  [notInLater]: 'Not in later analysis',
};

export type MoversFile = { file: Blob; name: string; rows: number };

/** The customers who went from `from` to `to`, scored as in the later analysis when they are in it. */
export async function exportMovers(
  earlierId: string,
  laterId: string,
  map: SegmentMap,
  from: string,
  to: string,
  today = new Date(),
): Promise<MoversFile> {
  const [earlier, later] = await Promise.all([recordsOf(earlierId), recordsOf(laterId)]);
  const segmentOf = (c: CustomerScoreRecord | undefined) =>
    c ? segmentFor(map, c.r as Score, c.f as Score, c.m as Score) : undefined;
  const byKey = (list: CustomerScoreRecord[]) => new Map(list.map((c) => [c.customerKey, c]));
  const before = byKey(earlier);
  const after = byKey(later);
  const keys = new Set([...before.keys(), ...after.keys()]);
  const movers: { earlier?: CustomerScoreRecord; later?: CustomerScoreRecord }[] = [];
  for (const key of keys) {
    const e = before.get(key);
    const l = after.get(key);
    if ((segmentOf(e) ?? notInEarlier) === from && (segmentOf(l) ?? notInLater) === to) {
      movers.push({ ...(e ? { earlier: e } : {}), ...(l ? { later: l } : {}) });
    }
  }
  const name = (id: string) =>
    outsideNames[id] ?? map.segments.find((s) => s.id === id)?.name ?? id;
  const withEmail = movers.some((m) => (m.later ?? m.earlier)?.email !== undefined);
  const header = [
    'Customer ID',
    ...(withEmail ? ['Email'] : []),
    'Earlier segment',
    'Later segment',
    'Recency (days)',
    'Orders',
    'Spend',
    'R',
    'F',
    'M',
  ];
  const rows = movers.map(({ earlier: e, later: l }): CsvValue[] => {
    const c = (l ?? e) as CustomerScoreRecord;
    return [
      c.customerKey,
      ...(withEmail ? [c.email ?? null] : []),
      name(from),
      name(to),
      c.recencyDays,
      c.frequency,
      { money: c.monetaryMinor / 100 },
      c.r,
      c.f,
      c.m,
    ];
  });
  const slug = (id: string) => id.replace(/[^a-z0-9-]/g, '');
  const date = today.toISOString().slice(0, 10);
  return {
    file: new Blob([toCsv(header, rows)], { type: 'text/csv;charset=utf-8' }),
    name: `movers-${slug(from)}-to-${slug(to)}-${date}.csv`,
    rows: rows.length,
  };
}
