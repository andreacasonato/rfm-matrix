import { describe, expect, it } from 'vitest';
import type { WorkerMessage } from './protocol';
import { runAnalysis } from './run-analysis';

const columns = { customer: 'Email', orderId: 'Name', orderedAt: 'Created at', amount: 'Total' };
const csv = [
  'Name,Email,Created at,Total,Lineitem name',
  '#1,a@example.test,2026-01-01T10:00:00Z,30.00,"Mug, large"',
  '#1,a@example.test,2026-01-01T10:00:00Z,,Spoon',
  '#2,a@example.test,2026-02-01T10:00:00Z,10.00,Mug',
  '#3,b@example.test,2026-03-01T10:00:00Z,5.50,Tea',
  '#4,,2026-03-02T10:00:00Z,9.00,No email',
].join('\n');

async function run(text: string, chunkSize?: number) {
  const messages: WorkerMessage[] = [];
  let clock = 0;
  await runAnalysis(text, columns, (m) => messages.push(m), {
    now: () => (clock += 300),
    ...(chunkSize === undefined ? {} : { chunkSize }),
  });
  return messages;
}

describe('runAnalysis', () => {
  it('reports per-customer totals when the file is done', async () => {
    const done = (await run(csv)).at(-1);
    expect(done).toMatchObject({
      type: 'done',
      rowsRead: 5,
      rowsUsed: 4,
      invalidRows: 1,
      customers: 2,
      orders: 3,
      monetaryTotal: 45.5,
    });
  });

  it('posts progress while reading, at most every 250 ms or 50,000 rows', async () => {
    const messages = await run(csv, 40);
    const progress = messages.filter((m) => m.type === 'progress');
    expect(progress.length).toBeGreaterThan(1);
    expect(progress.at(-1)).toMatchObject({ rowsRead: 5, customers: 2 });
  });

  it('reports a missing required column by name', async () => {
    const messages = await run('Name,Email,Total\n#1,a@example.test,1');
    expect(messages).toEqual([{ type: 'error', message: 'Missing column: Created at' }]);
  });
});
