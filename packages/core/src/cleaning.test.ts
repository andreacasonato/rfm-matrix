import { describe, expect, it } from 'vitest';
import {
  defaultExcludedStatuses,
  isExcludedByDefault,
  normaliseStatus,
  statusCounts,
} from './cleaning';

describe('statuses (ADR-0013 rule 2)', () => {
  it('normalises case, spaces and underscores', () => {
    expect(normaliseStatus('  Partially_Refunded ')).toBe('partially refunded');
    expect(normaliseStatus(undefined)).toBe('');
  });

  it.each([
    'cancelled',
    'Canceled',
    'voided',
    'failed',
    'declined',
    'pending',
    'pending payment',
    'draft',
    'test',
    'trash',
    'refunded',
    'wc-cancelled',
  ])('excludes %j by default', (status) => {
    expect(isExcludedByDefault(status)).toBe(true);
  });

  it.each(['paid', 'completed', 'partially_refunded', 'processing', 'fulfilled', ''])(
    'keeps %j by default',
    (status) => {
      expect(isExcludedByDefault(status)).toBe(false);
    },
  );

  it('lists the default exclusions among the statuses in a file, normalised', () => {
    expect(defaultExcludedStatuses(['Paid', 'Cancelled', 'refunded', 'Refunded'])).toEqual([
      'cancelled',
      'refunded',
    ]);
  });
});

describe('statusCounts', () => {
  it('adds up orders per status across days, most orders first', () => {
    const profile = {
      groups: [
        { status: 'paid', day: 1, orders: 3 },
        { status: 'cancelled', day: 1, orders: 4 },
        { status: 'paid', day: 2, orders: 2 },
        { status: '', day: null, orders: 1 },
      ],
      refunds: 0,
      latestDay: 2,
    };
    expect(statusCounts(profile)).toEqual([
      { status: 'paid', orders: 5 },
      { status: 'cancelled', orders: 4 },
      { status: '', orders: 1 },
    ]);
  });
});
