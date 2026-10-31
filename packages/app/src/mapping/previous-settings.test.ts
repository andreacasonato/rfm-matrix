import { defaultScoring } from '@rfm-matrix/core';
import { describe, expect, it } from 'vitest';
import { defaultScoringChoices, scoringFrom } from '../thresholds/choices';
import {
  choicesFromRules,
  columnNamesOf,
  mappingFromPrevious,
  scoringChoicesFrom,
} from './previous-settings';

describe("reusing a project's settings for its next export (journey 4)", () => {
  const previous = {
    columns: { orderId: 0, customerId: 1, orderedAt: 2, amount: 3, status: 4 },
    columnNames: {
      orderId: 'Order',
      customerId: 'Customer ID',
      orderedAt: 'Date',
      amount: 'Total',
      status: 'Status',
    },
    read: { decimal: ',' as const, dateOrder: 'mdy' as const },
    amountLevel: 'line' as const,
  };

  it('finds each column by its name, even when the export reorders them', () => {
    const header = ['Total', 'Date', 'Status', 'Order', 'Customer ID', 'Billing Name'];
    expect(mappingFromPrevious(header, previous)).toEqual({
      mapping: { orderId: 3, customerId: 4, orderedAt: 1, amount: 0, status: 2 },
      missing: [],
    });
  });

  it('reports columns the new export no longer has, and leaves them out', () => {
    const header = ['Order', 'Customer ID', 'Date', 'Total'];
    expect(mappingFromPrevious(header, previous)).toEqual({
      mapping: { orderId: 0, customerId: 1, orderedAt: 2, amount: 3 },
      missing: ['status'],
    });
  });

  it('records the header names of mapped columns', () => {
    expect(columnNamesOf({ orderId: 1, amount: 0 }, ['Total', 'Order', 'Notes'])).toEqual({
      orderId: 'Order',
      amount: 'Total',
    });
  });

  it('restores cleaning choices, with the analysis date back to "latest"', () => {
    const choices = choicesFromRules({
      excludedStatuses: ['cancelled', 'test'],
      amountBasis: 'net',
      subtractRefunds: false,
      analysisDate: new Date('2026-01-01T00:00:00Z'),
      lookbackDays: 400,
    });
    expect(choices).toEqual({
      excluded: new Set(['cancelled', 'test']),
      basis: 'net',
      subtractRefunds: false,
      dateMode: 'latest',
      customDate: '',
      lookback: 'custom',
      customDays: '400',
    });
    expect(
      choicesFromRules({
        excludedStatuses: [],
        amountBasis: 'gross',
        subtractRefunds: true,
        lookbackDays: 365,
      }).lookback,
    ).toBe('365');
  });

  it('restores scoring choices that give back the same methods', () => {
    const fixed = {
      ...defaultScoring,
      m: {
        method: 'fixed' as const,
        breaks: [50, 100, 200, 400] as [number, number, number, number],
      },
    };
    expect(scoringFrom(scoringChoicesFrom(fixed)).methods).toEqual(fixed);
    expect(scoringChoicesFrom(defaultScoring).r).toEqual(defaultScoringChoices.r);
  });
});
