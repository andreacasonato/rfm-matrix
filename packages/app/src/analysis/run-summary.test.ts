import { describe, expect, it } from 'vitest';
import type { AnalysisPlan, WorkerMessage } from './protocol';
import { runSummary } from './run-summary';

const plan: AnalysisPlan = {
  mapping: { orderId: 0, email: 1, orderedAt: 2, amount: 3, status: 4 },
  read: { decimal: '.', dateOrder: 'dmy' },
  amountLevel: 'order',
};

const csv = [
  'Name,Email,Created at,Total,Status',
  '#1,a@example.test,2026-01-01,30.00,paid',
  '#1,a@example.test,2026-01-01,,',
  '#2,b@example.test,2026-01-03,10.00,cancelled',
  '#3,,2026-01-04,9.00,paid',
].join('\n');

describe('runSummary', () => {
  it('reports orders by status and day, and the rows it could use', async () => {
    const messages: WorkerMessage[] = [];
    await runSummary(new Blob([csv]), plan, {}, (m) => messages.push(m));
    const done = messages.at(-1);
    if (done?.type !== 'summary-done') throw new Error(`expected summary-done, got ${done?.type}`);
    expect(done.summary).toMatchObject({ rowsRead: 4, rowsUsed: 3, customers: 2 });
    expect(done.summary.profile.latestDay).toBe(Date.UTC(2026, 0, 3) / 86_400_000);
    expect(done.summary.profile.groups).toHaveLength(2);
  });

  it('passes on read errors', async () => {
    const messages: WorkerMessage[] = [];
    await runSummary(new Blob(['Name\n#1']), plan, {}, (m) => messages.push(m));
    expect(messages.at(-1)).toMatchObject({ type: 'error' });
  });
});
