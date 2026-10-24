// Streams a CSV file in chunks so it is never held in memory whole (TRD §4, ADR-0003).
// The delimiter is detected from the first chunk unless the caller gives one.
import Papa from 'papaparse';
import { DecodedBlobStream, type TextEncodingName } from './decoded-stream';

export type CsvProblem = { row: number; message: string };
export type CsvSummary = { rowsRead: number; problems: CsvProblem[]; delimiter: string };
export type CsvOptions = { chunkSize?: number; encoding?: TextEncodingName; delimiter?: string };
export type CsvHandlers = {
  onHeader(cells: string[]): void;
  onRows(rows: string[][], bytesRead: number): void;
};

const maxProblems = 100;
const defaultSliceBytes = 4 * 1024 * 1024;

export function streamCsv(
  source: Blob | string,
  handlers: CsvHandlers,
  options: CsvOptions = {},
): Promise<CsvSummary> {
  return new Promise((resolve, reject) => {
    let headerSeen = false;
    let rowsRead = 0;
    let delimiter = options.delimiter ?? '';
    let failure: unknown;
    const problems: CsvProblem[] = [];
    const stream =
      typeof source === 'string'
        ? undefined
        : new DecodedBlobStream(
            source,
            options.encoding ?? 'utf-8',
            options.chunkSize ?? defaultSliceBytes,
          );

    // Papa's types do not describe its Node-stream input, which DecodedBlobStream imitates.
    Papa.parse<string[]>((stream ?? source) as unknown as File, {
      header: false,
      skipEmptyLines: 'greedy',
      delimiter: options.delimiter ?? '',
      ...(stream ? {} : { chunkSize: options.chunkSize ?? defaultSliceBytes }),
      chunk(results, parser) {
        try {
          if (!delimiter) delimiter = results.meta.delimiter;
          const rows = results.data;
          let offset = 0;
          if (!headerSeen && rows.length > 0) {
            headerSeen = true;
            offset = 1;
            const header = rows[0] ?? [];
            if (header[0]?.startsWith('\uFEFF')) header[0] = header[0].slice(1);
            handlers.onHeader(header);
          }
          // Errors without a row (e.g. delimiter guesses) describe the file, not a row.
          for (const error of results.errors) {
            if (problems.length >= maxProblems) break;
            if (error.row === undefined) continue;
            problems.push({ row: rowsRead + error.row - offset + 1, message: error.message });
          }
          const dataRows = offset === 0 ? rows : rows.slice(offset);
          rowsRead += dataRows.length;
          handlers.onRows(dataRows, stream ? stream.bytesRead : results.meta.cursor);
        } catch (error) {
          failure = error;
          stream?.stop();
          parser.abort();
        }
      },
      complete() {
        if (failure !== undefined) reject(failure);
        else resolve({ rowsRead, problems, delimiter });
      },
      error(error: Error) {
        stream?.stop();
        reject(error);
      },
    });
  });
}
