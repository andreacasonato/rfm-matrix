import { describe, expect, it } from 'vitest';
import { streamCsv } from './csv-stream';

async function collect(text: string, chunkSize?: number) {
  let header: string[] = [];
  const rows: string[][] = [];
  const summary = await streamCsv(
    text,
    {
      onHeader: (cells) => {
        header = cells;
      },
      onRows: (chunk) => {
        rows.push(...chunk);
      },
    },
    chunkSize === undefined ? {} : { chunkSize },
  );
  return { header, rows, summary };
}

describe('streamCsv', () => {
  it('separates the header from data rows', async () => {
    const { header, rows, summary } = await collect('a,b\n1,2\n3,4\n');
    expect(header).toEqual(['a', 'b']);
    expect(rows).toEqual([
      ['1', '2'],
      ['3', '4'],
    ]);
    expect(summary).toEqual({ rowsRead: 2, problems: [], delimiter: ',' });
  });

  it('streams a file in many chunks without losing or splitting rows', async () => {
    const lines = Array.from({ length: 500 }, (_, i) => `c${i},"Mug, large",${i}`);
    const { rows } = await collect(`id,name,n\n${lines.join('\n')}`, 64);
    expect(rows).toHaveLength(500);
    expect(rows[499]).toEqual(['c499', 'Mug, large', '499']);
  });

  it('handles quotes, escaped quotes and line breaks inside fields', async () => {
    const { rows } = await collect('a,b\n"say ""hi""","two\nlines"\n');
    expect(rows).toEqual([['say "hi"', 'two\nlines']]);
  });

  it('detects semicolon delimiters, CRLF endings and strips a byte-order mark', async () => {
    const { header, rows } = await collect('\uFEFFEmail;Total\r\nx@example.test;12,50\r\n');
    expect(header).toEqual(['Email', 'Total']);
    expect(rows).toEqual([['x@example.test', '12,50']]);
  });

  it('skips blank lines', async () => {
    const { rows } = await collect('a\n1\n\n   \n2\n');
    expect(rows).toEqual([['1'], ['2']]);
  });

  it('reports malformed rows with their row number', async () => {
    const { summary } = await collect('a,b\n1,2\n"unclosed,3\n');
    expect(summary.problems).toEqual([expect.objectContaining({ row: 2 })]);
  });

  it('stops and rejects when the header handler throws', async () => {
    const run = streamCsv('a\n1\n', {
      onHeader: () => {
        throw new Error('Missing column: Email');
      },
      onRows: () => {},
    });
    await expect(run).rejects.toThrow('Missing column: Email');
  });

  it('resolves with nothing read for an empty file', async () => {
    const { header, summary } = await collect('');
    expect(header).toEqual([]);
    expect(summary.rowsRead).toBe(0);
  });
});
