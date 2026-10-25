// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AnalysisPlan, FileSummary, SummaryDoneMessage } from '../analysis/protocol';
import { CleanScreen } from './CleanScreen';

afterEach(cleanup);

const day = (iso: string) =>
  Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) /
  86_400_000;

const summary: FileSummary = {
  profile: {
    groups: [
      { status: 'paid', day: day('2026-05-01'), orders: 6 },
      { status: 'cancelled', day: day('2026-05-02'), orders: 2 },
      { status: 'paid', day: day('2024-01-01'), orders: 1 },
      { status: 'paid', day: null, orders: 1 },
    ],
    refunds: 1,
    latestDay: day('2026-05-02'),
  },
  rowsRead: 12,
  rowsUsed: 11,
  customers: 7,
};

const plan: AnalysisPlan = {
  mapping: { orderId: 0, email: 1, orderedAt: 2, amount: 3, status: 4 },
  read: { decimal: '.', dateOrder: 'dmy' },
  amountLevel: 'order',
};

async function renderClean(onRun = vi.fn(), result: FileSummary = summary) {
  const summarise = vi.fn(() => ({
    result: Promise.resolve<SummaryDoneMessage>({ type: 'summary-done', summary: result }),
    cancel: vi.fn(),
  }));
  render(
    <CleanScreen
      fileName="orders.csv"
      file={new Blob(['x'])}
      plan={plan}
      format={{}}
      onBack={() => {}}
      onRun={onRun}
      summarise={summarise}
    />,
  );
  await act(async () => {});
  return onRun;
}

const counts = () => screen.getByTestId('exclusion-counts').textContent ?? '';

describe('CleanScreen (story 3)', () => {
  it('shows each status with its order count, cancelled left out by default', async () => {
    await renderClean();
    expect(screen.getByLabelText(/paid · 8 orders/)).toHaveProperty('checked', true);
    expect(screen.getByLabelText(/cancelled · 2 orders/)).toHaveProperty('checked', false);
    expect(counts()).toContain('7 orders will be analysed');
    expect(counts()).toContain('2 left out by status');
    expect(counts()).toContain('1 without a date');
    expect(counts()).toContain('1 row could not be read');
  });

  it('updates the counts when a status is ticked', async () => {
    await renderClean();
    fireEvent.click(screen.getByLabelText(/cancelled · 2 orders/));
    expect(counts()).toContain('9 orders will be analysed');
  });

  it('counts orders outside a lookback window', async () => {
    await renderClean();
    fireEvent.change(screen.getByLabelText('Orders to include'), { target: { value: '365' } });
    expect(counts()).toContain('1 before the window');
    expect(counts()).toContain('6 orders will be analysed');
  });

  it('counts orders after a chosen analysis date', async () => {
    await renderClean();
    fireEvent.click(screen.getByLabelText('Another date'));
    fireEvent.change(screen.getByLabelText('Analysis date'), { target: { value: '2026-04-30' } });
    expect(counts()).toContain('6 after the analysis date');
  });

  it('runs the analysis with the chosen rules', async () => {
    const onRun = await renderClean();
    fireEvent.click(screen.getByLabelText(/cancelled · 2 orders/));
    fireEvent.change(screen.getByLabelText('Orders to include'), { target: { value: '730' } });
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis' }));
    expect(onRun).toHaveBeenCalledWith({
      ...plan,
      cleaning: {
        excludedStatuses: [],
        amountBasis: 'gross',
        subtractRefunds: true,
        lookbackDays: 730,
      },
    });
  });

  it('cannot use net amounts without tax or shipping columns, and says why', async () => {
    await renderClean();
    expect(screen.getByLabelText(/Net/)).toHaveProperty('disabled', true);
    expect(screen.getByText(/map a Tax or Shipping column/)).toBeTruthy();
  });

  it('warns when more than half of the orders are left out', async () => {
    await renderClean();
    fireEvent.click(screen.getByLabelText(/paid · 8 orders/));
    expect(screen.getByRole('status').textContent).toContain('More than half');
  });
});
