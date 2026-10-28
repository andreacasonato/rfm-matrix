// The upload screen's preview: file checks, the first rows, and a count of every row
// (PRD story 1, APP_FLOW "Upload and preview").
import { type CsvProblem, streamCsv } from './csv-stream';
import type { TextEncodingName } from './decoded-stream';
import { sniffFile } from './sniff';

export type CsvPreview = {
  header: string[];
  rows: string[][];
  rowCount: number;
  delimiter: string;
  encoding: TextEncodingName;
  problems: CsvProblem[];
};

export type PreviewOptions = {
  encoding?: TextEncodingName;
  delimiter?: string;
  previewRows?: number;
  chunkSize?: number;
  onProgress?: (rowsRead: number, bytesRead: number) => void;
  /** Larger files are refused before any byte is read; defaults to `maxFileBytes`. */
  maxBytes?: number;
};

/** Just above the 304 MB file the 1M-row benchmark proved within memory (ADR-0017). */
export const maxFileBytes = 320_000_000;

export type UnreadableKind = 'xlsx' | 'xls' | 'binary' | 'empty' | 'too-large';

export class UnreadableFileError extends Error {
  constructor(readonly kind: UnreadableKind) {
    super(`This file cannot be read as CSV (${kind}).`);
    this.name = 'UnreadableFileError';
  }
}

export async function previewCsv(file: Blob, options: PreviewOptions = {}): Promise<CsvPreview> {
  if (file.size > (options.maxBytes ?? maxFileBytes)) throw new UnreadableFileError('too-large');
  const sniff = await sniffFile(file);
  if (sniff.kind !== 'text') throw new UnreadableFileError(sniff.kind);
  const encoding = options.encoding ?? sniff.encoding;
  const previewRows = options.previewRows ?? 20;

  let header: string[] = [];
  const rows: string[][] = [];
  let rowCount = 0;
  const summary = await streamCsv(
    file,
    {
      onHeader(cells) {
        header = cells;
      },
      onRows(chunk, bytesRead) {
        for (const row of chunk) if (rows.length < previewRows) rows.push(row);
        rowCount += chunk.length;
        options.onProgress?.(rowCount, bytesRead);
      },
    },
    {
      encoding,
      ...(options.delimiter === undefined ? {} : { delimiter: options.delimiter }),
      ...(options.chunkSize === undefined ? {} : { chunkSize: options.chunkSize }),
    },
  );
  if (header.length === 0) throw new UnreadableFileError('empty');

  return {
    header,
    rows,
    rowCount,
    delimiter: summary.delimiter,
    encoding,
    problems: summary.problems,
  };
}
