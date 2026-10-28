// Writes many customer records inside an open transaction in awaited batches, so only a batch of
// writes is ever queued: with all 270,814 at once, 1M rows went over the memory limit (ADR-0019).
import type { CustomerScoreRecord } from './schema';

export const defaultBatchSize = 5_000;

type ScoreStore = { put(record: CustomerScoreRecord): Promise<unknown> };

export async function putInBatches(
  store: ScoreStore,
  count: number,
  record: (i: number) => CustomerScoreRecord,
  batchSize = defaultBatchSize,
): Promise<void> {
  let batch: Promise<unknown>[] = [];
  for (let i = 0; i < count; i++) {
    batch.push(store.put(record(i)));
    if (batch.length === batchSize) {
      await Promise.all(batch);
      batch = [];
    }
  }
  await Promise.all(batch);
}
