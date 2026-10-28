import { describe, expect, it } from 'vitest';
import type { AnalysisPlan, WorkerMessage } from './protocol';
import { runAnalysis } from './run-analysis';

// Header: Name,Email,Created at,Total,Lineitem name
const plan: AnalysisPlan = {
  mapping: { orderId: 0, email: 1, orderedAt: 2, amount: 3 },
  read: { decimal: '.', dateOrder: 'dmy' },
  amountLevel: 'order',
};
const header = 'Name,Email,Created at,Total,Lineitem name';
const csv = [
  header,
  '#1,a@example.test,2026-01-01T10:00:00Z,30.00,"Mug, large"',
  '#1,a@example.test,2026-01-01T10:00:00Z,,Spoon',
  '#2,a@example.test,2026-02-01T10:00:00Z,10.00,Mug',
  '#3,b@example.test,2026-03-01T10:00:00Z,5.50,Tea',
  '#4,,2026-03-02T10:00:00Z,9.00,No email',
  '#5,c@example.test,2026-03-03T10:00:00Z,12.00,Tea',
  '#6,d@example.test,2026-03-04T10:00:00Z,8.00,Tea',
  '#7,e@example.test,2026-03-05T10:00:00Z,20.00,Tea',
  '#8,f@example.test,2026-03-06T10:00:00Z,14.50,Tea',
].join('\n');

async function run(text: string, chunkSize?: number) {
  const messages: WorkerMessage[] = [];
  let clock = 0;
  lastTable = await runAnalysis(text, plan, (m) => messages.push(m), {
    now: () => (clock += 300),
    ...(chunkSize === undefined ? {} : { chunkSize }),
  });
  return messages;
}

let lastTable: Awaited<ReturnType<typeof runAnalysis>>;

describe('runAnalysis', () => {
  it('reports totals and segment counts when the file is done', async () => {
    const done = (await run(csv)).at(-1);
    expect(done).toMatchObject({
      type: 'done',
      rowsRead: 9,
      rowsUsed: 8,
      invalidRows: 1,
      customers: 6,
      orders: 7,
      monetaryTotal: 100,
      analysisDate: '2026-03-07',
    });
    if (done?.type !== 'done') throw new Error('expected done');
    expect(done.segments.segments).toHaveLength(11);
    expect(done.segments.segments.reduce((n, s) => n + s.customers, 0)).toBe(6);
    expect(done.segments.totals).toEqual({ customers: 6, revenue: 100 });
    // The grid (S5): 25 cells adding up to the same totals, and the repeat customers.
    expect(done.grid).toHaveLength(25);
    expect(done.grid.reduce((n, c) => n + c.customers, 0)).toBe(6);
    expect(done.grid.reduce((n, c) => n + c.revenue, 0)).toBeCloseTo(100, 6);
    expect(done.repeatCustomers).toBe(1);
    // Kept by the worker for segment detail and export (S6), with emails as mapped.
    expect(lastTable?.table.keys).toHaveLength(6);
    expect(lastTable?.table.emails).toContain('a@example.test');
  });

  it('posts progress while reading, at most every 250 ms or 50,000 rows', async () => {
    const messages = await run(csv, 40);
    const progress = messages.filter((m) => m.type === 'progress');
    expect(progress.length).toBeGreaterThan(1);
    expect(progress.at(-1)).toMatchObject({ rowsRead: 9, customers: 6 });
  });

  it('refuses a file whose columns no longer match the plan', async () => {
    const messages = await run('Name,Email\n#1,a@example.test');
    expect(messages).toEqual([
      { type: 'error', message: 'Order date points to a column that is not in this file.' },
    ]);
  });

  it('reads the file with the format chosen on the upload screen', async () => {
    // A forced semicolon turns each comma-separated line into one cell, so columns go missing.
    const messages: WorkerMessage[] = [];
    await runAnalysis(new Blob([csv]), plan, (m) => messages.push(m), {
      format: { delimiter: ';', encoding: 'utf-8' },
    });
    expect(messages.at(-1)).toEqual({
      type: 'error',
      message: 'Email points to a column that is not in this file.',
    });
  });

  it('blocks scoring with fewer than 5 customers', async () => {
    const few = [header, '#1,a@example.test,2026-01-01T10:00:00Z,30.00,Mug'].join('\n');
    expect((await run(few)).at(-1)).toEqual({
      type: 'error',
      message: 'Scores need at least 5 customers; this data has 1.',
      tooFewCustomers: 1,
    });
  });
});
