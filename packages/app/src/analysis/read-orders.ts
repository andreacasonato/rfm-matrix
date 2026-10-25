// Reads a file into an OrderBook through the confirmed plan. Shared by the cleaning summary
// and the analysis, so both see exactly the same orders.
import { OrderBook, toOrderRow, validateMapping } from '@rfm-matrix/core';
import { type CsvProblem, streamCsv } from '@rfm-matrix/io';
import type { AnalysisPlan, CsvFormat } from './protocol';

const progressEveryMs = 250;
const progressEveryRows = 50_000;

export type ReadOptions = {
  format?: CsvFormat;
  chunkSize?: number;
  now?: () => number;
  onProgress?(progress: { rowsRead: number; bytesRead: number; customers: number }): void;
};

export type ReadResult = {
  book: OrderBook;
  rowsRead: number;
  rowsUsed: number;
  problems: CsvProblem[];
};

export async function readOrders(
  source: Blob | string,
  plan: AnalysisPlan,
  { format = {}, chunkSize, now = () => performance.now(), onProgress }: ReadOptions = {},
): Promise<ReadResult> {
  const book = new OrderBook({ amountLevel: plan.amountLevel });
  let headerChecked = false;
  let rowsRead = 0;
  let rowsUsed = 0;
  let lastPostAt = now();
  let lastPostRows = 0;

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
          if (!row) continue;
          book.add(row);
          rowsUsed++;
        }
        rowsRead += rows.length;
        const time = now();
        if (time - lastPostAt >= progressEveryMs || rowsRead - lastPostRows >= progressEveryRows) {
          onProgress?.({ rowsRead, bytesRead, customers: book.customerCount });
          lastPostAt = time;
          lastPostRows = rowsRead;
        }
      },
    },
    { ...format, ...(chunkSize === undefined ? {} : { chunkSize }) },
  );
  return { book, rowsRead: summary.rowsRead, rowsUsed, problems: summary.problems };
}
