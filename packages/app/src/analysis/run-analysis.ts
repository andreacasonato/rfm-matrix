// The worker's job, kept free of worker globals so it can be tested in Node.
import { type ColumnIndexes, createAggregator, toOrderRow } from '@rfm-matrix/core';
import { streamCsv } from '@rfm-matrix/io';
import type { ColumnNames, WorkerMessage } from './protocol';

const progressEveryMs = 250;
const progressEveryRows = 50_000;

type Options = { now?: () => number; chunkSize?: number };

function findColumns(header: string[], names: ColumnNames): ColumnIndexes {
  const indexOf = (name: string) => {
    const index = header.findIndex((cell) => cell.trim() === name);
    if (index < 0) throw new Error(`Missing column: ${name}`);
    return index;
  };
  return {
    customer: indexOf(names.customer),
    orderId: indexOf(names.orderId),
    orderedAt: indexOf(names.orderedAt),
    amount: indexOf(names.amount),
  };
}

export async function runAnalysis(
  source: Blob | string,
  names: ColumnNames,
  post: (message: WorkerMessage) => void,
  { now = () => performance.now(), chunkSize }: Options = {},
): Promise<void> {
  const started = now();
  const aggregator = createAggregator();
  let columns: ColumnIndexes | undefined;
  let rowsRead = 0;
  let rowsUsed = 0;
  let lastPostAt = started;
  let lastPostRows = 0;

  try {
    const summary = await streamCsv(
      source,
      {
        onHeader(header) {
          columns = findColumns(header, names);
        },
        onRows(rows, bytesRead) {
          if (!columns) return;
          for (const cells of rows) {
            const row = toOrderRow(cells, columns);
            if (row) {
              aggregator.add(row);
              rowsUsed++;
            }
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
      chunkSize === undefined ? {} : { chunkSize },
    );

    let orders = 0;
    let monetaryTotal = 0;
    for (const customer of aggregator.customers()) {
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
      elapsedMs: now() - started,
    });
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
}
