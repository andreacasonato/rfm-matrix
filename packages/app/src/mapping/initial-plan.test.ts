import type { CsvPreview } from '@rfm-matrix/io';
import { describe, expect, it } from 'vitest';
import { initialPlan } from './initial-plan';

const preview = (header: string[], rows: string[][]): CsvPreview => ({
  header,
  rows,
  rowCount: rows.length,
  delimiter: ',',
  encoding: 'utf-8',
  problems: [],
});

describe('initialPlan', () => {
  it('guesses the mapping and reads ISO dates and decimal points from the preview', () => {
    const header = ['Name', 'Email', 'Created at', 'Total'];
    const rows = [['#1', 'a@example.test', '2026-01-05 10:00:00 +0100', '12.50']];
    expect(initialPlan(preview(header, rows))).toEqual({
      preset: 'shopify',
      dates: 'iso',
      plan: {
        mapping: { orderId: 0, email: 1, orderedAt: 2, amount: 3 },
        read: { decimal: '.', dateOrder: 'dmy' },
        amountLevel: 'order',
      },
    });
  });

  it('detects decimal commas and day-first dates', () => {
    const header = ['Customer ID', 'Order No', 'Date', 'Amount'];
    const rows = [
      ['1', 'A1', '25/04/2026', '12,50'],
      ['2', 'A2', '03/05/2026', '3,10'],
    ];
    const { plan, dates } = initialPlan(preview(header, rows));
    expect(plan.read).toEqual({ decimal: ',', dateOrder: 'dmy' });
    expect(dates).toBe('dmy');
  });

  it('reports ambiguous dates so the screen can ask', () => {
    const rows = [['1', 'A1', '03/04/2026', '1']];
    const { dates } = initialPlan(preview(['Customer ID', 'Order No', 'Date', 'Amount'], rows));
    expect(dates).toBe('ambiguous');
  });

  it('uses a preset chosen by the user instead of the detected one', () => {
    const header = ['order_number', 'order_date', 'order_total', 'billing_email'];
    expect(initialPlan(preview(header, []), 'woocommerce').preset).toBe('woocommerce');
  });
});
