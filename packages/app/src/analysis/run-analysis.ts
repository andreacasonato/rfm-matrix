// The worker's analysis job, kept free of worker globals so it can be tested in Node.
import {
  applySegments,
  type CleaningRules,
  defaultScoring,
  defaultSegmentMap,
  score,
  summariseSegments,
} from '@rfm-matrix/core';
import type { AnalysisPlan, CsvFormat, WorkerMessage } from './protocol';
import { readOrders } from './read-orders';

type Options = { now?: () => number; chunkSize?: number; format?: CsvFormat };

// Until the user chooses on the cleaning screen, every order counts.
const keepAll: CleaningRules = {
  excludedStatuses: [],
  amountBasis: 'gross',
  subtractRefunds: true,
};

export async function runAnalysis(
  source: Blob | string,
  plan: AnalysisPlan,
  post: (message: WorkerMessage) => void,
  { now = () => performance.now(), chunkSize, format = {} }: Options = {},
): Promise<void> {
  const started = now();
  try {
    const read = await readOrders(source, plan, {
      format,
      now,
      ...(chunkSize === undefined ? {} : { chunkSize }),
      onProgress: (progress) => post({ type: 'progress', ...progress }),
    });
    const { customers, counts, analysisDate } = read.book.finish(plan.cleaning ?? keepAll);
    const scoring = plan.scoring ?? defaultScoring;
    const scores = score(customers, { scoring, ...(analysisDate ? { analysisDate } : {}) });
    const segmented = applySegments(scores.customers, defaultSegmentMap);
    let monetaryTotal = 0;
    for (const customer of customers) monetaryTotal += customer.monetary;
    post({
      type: 'done',
      rowsRead: read.rowsRead,
      rowsUsed: read.rowsUsed,
      invalidRows: read.rowsRead - read.rowsUsed,
      customers: customers.length,
      orders: counts.used,
      monetaryTotal,
      cleaning: counts,
      scoring,
      problems: read.problems.slice(0, 10),
      analysisDate: scores.analysisDate.toISOString().slice(0, 10),
      segments: summariseSegments(segmented, defaultSegmentMap),
      elapsedMs: now() - started,
    });
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
}
