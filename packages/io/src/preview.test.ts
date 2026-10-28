import { describe, expect, it, vi } from 'vitest';
import { maxFileBytes, previewCsv, UnreadableFileError } from './preview';

const lines = (n: number) => Array.from({ length: n }, (_, i) => `c${i},${i}`).join('\n');

describe('previewCsv', () => {
  it('refuses a file over the size limit before reading any of it', async () => {
    const file = new Blob(['id,n\n1,2\n']);
    const slice = vi.spyOn(file, 'slice');
    const stream = vi.spyOn(file, 'stream');
    await expect(previewCsv(file, { maxBytes: file.size - 1 })).rejects.toMatchObject({
      kind: 'too-large',
    });
    expect(slice).not.toHaveBeenCalled();
    expect(stream).not.toHaveBeenCalled();
  });

  it('reads a file exactly at the size limit', async () => {
    const file = new Blob(['id,n\n1,2\n']);
    await expect(previewCsv(file, { maxBytes: file.size })).resolves.toMatchObject({ rowCount: 1 });
  });

  it('limits files to 320 MB, just above the 1M-row benchmark file (ADR-0017)', () => {
    expect(maxFileBytes).toBe(320_000_000);
  });

  it('returns the first 20 rows and counts every row', async () => {
    const preview = await previewCsv(new Blob([`id,n\n${lines(50)}\n`]));
    expect(preview.header).toEqual(['id', 'n']);
    expect(preview.rows).toHaveLength(20);
    expect(preview.rows[19]).toEqual(['c19', '19']);
    expect(preview.rowCount).toBe(50);
    expect(preview).toMatchObject({ delimiter: ',', encoding: 'utf-8', problems: [] });
  });

  it('reports progress while counting', async () => {
    const seen: number[] = [];
    await previewCsv(new Blob([`id,n\n${lines(200)}`]), {
      chunkSize: 256,
      onProgress: (rowsRead) => seen.push(rowsRead),
    });
    expect(seen.length).toBeGreaterThan(1);
    expect(seen.at(-1)).toBe(200);
  });

  it('detects semicolons even when amounts use decimal commas', async () => {
    const csv =
      'Email;Total;Date\na@example.test;12,50;2026-01-01\nb@example.test;3,10;2026-01-02\n';
    const preview = await previewCsv(new Blob([csv]));
    expect(preview.delimiter).toBe(';');
    expect(preview.rows[0]).toEqual(['a@example.test', '12,50', '2026-01-01']);
  });

  it('detects tabs', async () => {
    expect((await previewCsv(new Blob(['a\tb\n1\t2\n']))).delimiter).toBe('\t');
  });

  it('detects and decodes Windows-1252', async () => {
    const bytes = Uint8Array.from([
      0x63, 0x69, 0x74, 0x79, 0x0a, 0x5a, 0xfc, 0x72, 0x69, 0x63, 0x68,
    ]);
    const preview = await previewCsv(new Blob([bytes]));
    expect(preview.encoding).toBe('windows-1252');
    expect(preview.rows).toEqual([['Zürich']]);
  });

  it('decodes UTF-16LE (Excel "Unicode text")', async () => {
    const text = 'a\tb\n1\t2\n';
    const units = Uint16Array.from([0xfeff, ...[...text].map((c) => c.charCodeAt(0))]);
    const preview = await previewCsv(new Blob([units]));
    expect(preview.encoding).toBe('utf-16le');
    expect(preview.rows).toEqual([['1', '2']]);
  });

  it('applies an encoding and delimiter chosen by the user', async () => {
    const preview = await previewCsv(new Blob(['a;b\nCafé;1,5\n']), {
      encoding: 'windows-1252',
      delimiter: ',',
    });
    expect(preview.encoding).toBe('windows-1252');
    expect(preview.rows).toEqual([['CafÃ©;1', '5']]);
  });

  it('returns no rows for a file with only a header', async () => {
    const preview = await previewCsv(new Blob(['Email,Total\n']));
    expect(preview).toMatchObject({ header: ['Email', 'Total'], rows: [], rowCount: 0 });
  });

  it('reports malformed rows', async () => {
    const preview = await previewCsv(new Blob(['a,b\n1,2\n"unclosed,3\n']));
    expect(preview.problems).toHaveLength(1);
  });

  it.each([
    ['xlsx', new Blob([Uint8Array.from([0x50, 0x4b, 0x03, 0x04])])],
    ['xls', new Blob([Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])])],
    ['binary', new Blob([Uint8Array.from([0x00, 0x01, 0x02])])],
    ['empty', new Blob([])],
    ['empty', new Blob(['  \n\n'])],
  ])('refuses a %s file with a typed error', async (kind, blob) => {
    const run = previewCsv(blob);
    await expect(run).rejects.toBeInstanceOf(UnreadableFileError);
    await expect(run).rejects.toMatchObject({ kind });
  });
});
