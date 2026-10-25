import { describe, expect, it } from 'vitest';
import { streamCsv } from './csv-stream';

async function collect(blob: Blob, options: Parameters<typeof streamCsv>[2] = {}) {
  let header: string[] = [];
  const rows: string[][] = [];
  const bytes: number[] = [];
  const summary = await streamCsv(
    blob,
    {
      onHeader: (cells) => {
        header = cells;
      },
      onRows: (chunk, bytesRead) => {
        rows.push(...chunk);
        bytes.push(bytesRead);
      },
    },
    options,
  );
  return { header, rows, bytes, summary };
}

describe('streamCsv on a file (Blob)', () => {
  const text = 'city,note\nZürich,café 😀\nŌtaki,"naïve, ok"\n';

  // Regression: Papa Parse decodes each byte slice on its own, so a character split across
  // two slices was corrupted. Every slice size must give the same rows.
  it.each([1, 2, 3, 5, 7, 64])(
    'keeps multi-byte characters intact with %i-byte slices',
    async (n) => {
      const { header, rows } = await collect(new Blob([text]), { chunkSize: n });
      expect(header).toEqual(['city', 'note']);
      expect(rows).toEqual([
        ['Zürich', 'café 😀'],
        ['Ōtaki', 'naïve, ok'],
      ]);
    },
  );

  it('decodes Windows-1252 when asked', async () => {
    const bytes = Uint8Array.from([0x6e, 0x61, 0x6d, 0x65, 0x0a, 0x43, 0x61, 0x66, 0xe9, 0x0a]);
    const { rows } = await collect(new Blob([bytes]), { encoding: 'windows-1252' });
    expect(rows).toEqual([['Café']]);
  });

  it('strips a UTF-8 byte-order mark', async () => {
    const bytes = Uint8Array.from([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('a\n1\n')]);
    const { header } = await collect(new Blob([bytes]));
    expect(header).toEqual(['a']);
  });

  it('reports bytes read, ending at the file size', async () => {
    const blob = new Blob([text]);
    const { bytes } = await collect(blob, { chunkSize: 8 });
    expect(bytes.at(-1)).toBe(blob.size);
    expect(bytes).toEqual([...bytes].sort((a, b) => a - b));
  });

  it('uses a delimiter given by the caller instead of guessing', async () => {
    const { rows, summary } = await collect(new Blob(['a;b\n1,5;2\n']), { delimiter: ';' });
    expect(rows).toEqual([['1,5', '2']]);
    expect(summary.delimiter).toBe(';');
  });

  it('stops reading and rejects when a handler throws', async () => {
    const run = streamCsv(new Blob(['a\n1\n2\n']), {
      onHeader: () => {
        throw new Error('Missing column: Email');
      },
      onRows: () => {},
    });
    await expect(run).rejects.toThrow('Missing column: Email');
  });
});
