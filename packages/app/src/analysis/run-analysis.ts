// The worker's job, kept free of worker globals so it can be tested in Node.
import {
  applySegments,
  createAggregator,
  defaultSegmentMap,
  score,
  summariseSegments,
  toOrderRow,
  validateMapping,
} from '@rfm-matrix/core';
import { streamCsv } from '@rfm-matrix/io';
import type { AnalysisPlan, CsvFormat, WorkerMessage } from './protocol';

const progressEveryMs = 250;
const progressEveryRows = 50_000;

type Options = { now?: () => number; chunkSize?: number; format?: CsvFormat };

export async function runAnalysis(
  source: Blob | string,
  plan: AnalysisPlan,
  post: (message: WorkerMessage) => void,
  { now = () => performance.now(), chunkSize, format = {} }: Options = {},
): Promise<void> {
  const started = now();
  const aggregator = createAggregator({ amountLevel: plan.amountLevel });
  let headerChecked = false;
  let rowsRead = 0;
  let rowsUsed = 0;
  let lastPostAt = started;
  let lastPostRows = 0;

  try {
    const summary = await streamCsv(
      source,
      {
        onHeader(header) {
          // The plan was made from a preview of this file; refuse it if the columns differ.
          const [problem] = validateMapping(plan.mapping, header);
          if (problem) throw new Error(problem);
          headerChecked = true;
        },
        onRows(rows, bytesRead) {
          if (!headerChecked) return;
          for (const cells of rows) {
            const row = toOrderRow(cells, plan.mapping, plan.read);
            if (row && aggregator.add(row)) rowsUsed++;
          }
          rowsRead += rows.length;
          const time = now();
          if (
            time - lastPostAt >= progressEveryMs ||
            rowsRead - lastPostRows >= progressEveryRows
          ) {
            post({ type: 'progress', rowsRead, bytesRead, customers: aggregator.customerCount });
            lastPostAt = time;
            lastPostRows = rowsRead;
          }
        },
      },
      { ...format, ...(chunkSize === undefined ? {} : { chunkSize }) },
    );

    const customers = aggregator.customers();
    const scores = score(customers);
    const segmented = applySegments(scores.customers, defaultSegmentMap);
    let orders = 0;
    let monetaryTotal = 0;
    for (const customer of customers) {
      orders += customer.orderCount;
      monetaryTotal += customer.monetary;
    }
    post({
      type: 'done',
      rowsRead: summary.rowsRead,
      rowsUsed,
      invalidRows: summary.rowsRead - rowsUsed,
      customers: aggregator.customerCount,
      orders,
      monetaryTotal,
      problems: summary.problems.slice(0, 10),
      analysisDate: scores.analysisDate.toISOString().slice(0, 10),
      segments: summariseSegments(segmented, defaultSegmentMap),
      elapsedMs: now() - started,
    });
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
}
