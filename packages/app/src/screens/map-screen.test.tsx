// @vitest-environment jsdom
import type { CsvPreview } from '@rfm-matrix/io';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MapScreen } from './MapScreen';

afterEach(cleanup);

const preview = (header: string[], rows: string[][]): CsvPreview => ({
  header,
  rows,
  rowCount: rows.length,
  delimiter: ',',
  encoding: 'utf-8',
  problems: [],
});

const shopify = preview(
  ['Name', 'Email', 'Financial Status', 'Created at', 'Total', 'Lineitem name'],
  [
    ['#1001', 'a@example.test', 'paid', '2026-04-03 10:00:00 +0000', '30.00', 'Mug'],
    ['#1001', 'a@example.test', '', '2026-04-03 10:00:00 +0000', '', 'Spoon'],
    ['#1002', 'b@example.test', 'refunded', '2026-04-05 09:00:00 +0000', '12.50', 'Tea'],
  ],
);

const renderMap = (p: CsvPreview, onConfirm = vi.fn()) => {
  render(<MapScreen fileName="orders.csv" preview={p} onBack={() => {}} onConfirm={onConfirm} />);
  return onConfirm;
};

const field = (label: string) => screen.getByRole('combobox', { name: label });

describe('MapScreen', () => {
  it('pre-selects Shopify columns and shows how sample values will be read (story 2)', () => {
    renderMap(shopify);
    expect(field('Where is this file from?')).toHaveProperty('value', 'shopify');
    expect(field('Order ID')).toHaveProperty('value', '0');
    expect(field('Email')).toHaveProperty('value', '1');
    expect(field('Order date')).toHaveProperty('value', '3');
    expect(field('Amount')).toHaveProperty('value', '4');
    const amount = screen.getByTestId('field-amount');
    expect(amount.textContent).toContain('30.00');
    expect(amount.textContent).toContain('30.00 → 30');
    expect(screen.getByTestId('field-orderedAt').textContent).toContain('3 April 2026');
  });

  it('confirms the plan with the chosen columns and amount rule', () => {
    const onConfirm = renderMap(shopify);
    fireEvent.click(screen.getByLabelText(/Each row is a product line/));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm columns' }));
    expect(onConfirm).toHaveBeenCalledWith({
      mapping: { orderId: 0, email: 1, orderedAt: 3, amount: 4, status: 2 },
      read: { decimal: '.', dateOrder: 'dmy' },
      amountLevel: 'line',
    });
  });

  it('lets any column be changed, and blocks confirming while a required one is missing', () => {
    const onConfirm = renderMap(shopify);
    fireEvent.change(field('Amount'), { target: { value: '' } });
    const confirm = screen.getByRole('button', { name: 'Confirm columns' });
    expect(confirm).toHaveProperty('disabled', true);
    expect(screen.getByRole('alert').textContent).toContain('order amount');
    fireEvent.change(field('Amount'), { target: { value: '4' } });
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('asks which date order to use when the file cannot tell', () => {
    const onConfirm = renderMap(
      preview(['Customer ID', 'Order No', 'Date', 'Amount'], [['7', 'A1', '03/04/2026', '9.00']]),
    );
    const confirm = screen.getByRole('button', { name: 'Confirm columns' });
    expect(confirm).toHaveProperty('disabled', true);
    const question = screen.getByRole('radiogroup', { name: /How should 03\/04\/2026 be read/ });
    fireEvent.click(within(question).getByLabelText('4 March 2026'));
    fireEvent.click(confirm);
    expect(onConfirm.mock.calls[0]?.[0].read.dateOrder).toBe('mdy');
  });

  it('reads decimal commas when detected, and lets the user switch', () => {
    const onConfirm = renderMap(
      preview(['Customer ID', 'Order No', 'Date', 'Amount'], [['7', 'A1', '2026-04-03', '12,50']]),
    );
    expect(field('Decimal separator')).toHaveProperty('value', ',');
    fireEvent.change(field('Decimal separator'), { target: { value: '.' } });
    expect(screen.getByTestId('field-amount').textContent).toContain('cannot be read');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm columns' }));
    expect(onConfirm.mock.calls[0]?.[0].read.decimal).toBe('.');
  });

  it('re-guesses the columns when another preset is chosen, and says WooCommerce is unverified', () => {
    renderMap(
      preview(['order_number', 'order_date', 'order_total', 'billing_email', 'customer_id'], []),
    );
    expect(field('Where is this file from?')).toHaveProperty('value', 'woocommerce');
    expect(screen.getByText(/check the columns below/)).toBeTruthy();
    expect(field('Customer ID')).toHaveProperty('value', '4');
  });
});
