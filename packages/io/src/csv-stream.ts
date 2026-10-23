// Streams a CSV file in chunks so it is never held in memory whole (TRD §4, ADR-0003).
// The delimiter is detected from the first chunk.
import Papa from 'papaparse';

export type CsvProblem = { row: number; message: string };
export type CsvSummary = { rowsRead: number; problems: CsvProblem[] };
export type CsvHandlers = {
  onHeader(cells: string[]): void;
  onRows(rows: string[][], bytesRead: number): void;
};

const maxProblems = 100;

export function streamCsv(
  source: Blob | string,
  handlers: CsvHandlers,
  options: { chunkSize?: number } = {},
): Promise<CsvSummary> {
  return new Promise((resolve, reject) => {
    let headerSeen = false;
    let rowsRead = 0;
    let failure: unknown;
    const problems: CsvProblem[] = [];

    Papa.parse<string[]>(source as File, {
      header: false,
      skipEmptyLines: 'greedy',
      chunkSize: options.chunkSize ?? 4 * 1024 * 1024,
      chunk(results, parser) {
        try {
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
          handlers.onRows(dataRows, results.meta.cursor);
        } catch (error) {
          failure = error;
          parser.abort();
        }
      },
      complete() {
        if (failure !== undefined) reject(failure);
        else resolve({ rowsRead, problems });
      },
      error(error: Error) {
        reject(error);
      },
    });
  });
}
