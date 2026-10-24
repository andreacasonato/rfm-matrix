import { describe, expect, it } from 'vitest';
import { type ReadSettings, toOrderRow } from './order-row';

const settings: ReadSettings = { decimal: '.', dateOrder: 'dmy' };
const mapping = { customerId: 0, email: 1, orderId: 2, orderedAt: 3, amount: 4, status: 5 };

describe('toOrderRow', () => {
  it('reads every mapped field, trimmed', () => {
    const cells = [' 42 ', ' A@Example.test ', ' #1001', '05/01/2026 10:00', ' €19.90 ', 'paid'];
    expect(toOrderRow(cells, mapping, settings)).toEqual({
      customerKey: '42',
      orderId: '#1001',
      orderedAt: new Date(Date.UTC(2026, 0, 5, 10)),
      amount: 19.9,
      status: 'paid',
    });
  });

  it('falls back to the lower-cased email when the row has no customer ID (SCHEMA.md)', () => {
    const cells = ['', ' A@Example.test ', '#1', '2026-01-05', '1', ''];
    expect(toOrderRow(cells, mapping, settings)?.customerKey).toBe('a@example.test');
  });

  it('uses the email alone when no customer ID column is mapped', () => {
    const { customerId: _, ...emailOnly } = mapping;
    const cells = ['99', 'B@example.test', '#1', '2026-01-05', '1', ''];
    expect(toOrderRow(cells, emailOnly, settings)?.customerKey).toBe('b@example.test');
  });

  it('leaves the amount out when the cell is empty, and keeps 0 as a real amount', () => {
    const base = ['1', '', '#1', '2026-01-05'];
    expect(toOrderRow([...base, '', ''], mapping, settings)).not.toHaveProperty('amount');
    expect(toOrderRow([...base, '0', ''], mapping, settings)?.amount).toBe(0);
  });

  it('leaves the date out when the cell is empty, for later lines of an order', () => {
    expect(toOrderRow(['1', '', '#1', '', '', ''], mapping, settings)).not.toHaveProperty(
      'orderedAt',
    );
  });

  it('reads decimal commas and month-first dates when told to', () => {
    const row = toOrderRow(['1', '', '#1', '01/05/2026', '1.234,50', ''], mapping, {
      decimal: ',',
      dateOrder: 'mdy',
    });
    expect(row).toMatchObject({ amount: 1234.5, orderedAt: new Date(Date.UTC(2026, 0, 5)) });
  });

  it.each([
    ['no customer ID or email', ['', ' ', '#1', '2026-01-05', '1', '']],
    ['no order ID', ['1', '', ' ', '2026-01-05', '1', '']],
    ['an unreadable date', ['1', '', '#1', 'yesterday', '1', '']],
    ['an unreadable amount', ['1', '', '#1', '2026-01-05', 'twelve', '']],
    ['too few cells', ['1', '', '#1']],
  ])('rejects a row with %s', (_label, cells) => {
    expect(toOrderRow(cells, mapping, settings)).toBeUndefined();
  });
});
