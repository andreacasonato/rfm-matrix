// @vitest-environment jsdom
import { parseAmount, parseDate } from '@rfm-matrix/core';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  exampleAmounts,
  exampleDates,
  exampleHeader,
  exampleRows,
  FileRequirements,
} from './FileRequirements';

afterEach(cleanup);

describe('What your file needs (U6)', () => {
  it('names the four required columns and the optional ones', () => {
    render(<FileRequirements />);
    const required = screen.getByRole('list', { name: 'Required columns' });
    expect(
      within(required)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(['Customer ID or email', 'Order ID', 'Order date', 'Amount']);
    const optional = screen.getByText(/Optional:/).textContent ?? '';
    for (const name of ['status', 'refunded amount', 'tax', 'shipping']) {
      expect(optional).toContain(name);
    }
  });

  it('shows a small example with the required columns and one returning customer', () => {
    render(<FileRequirements />);
    const table = screen.getByRole('table', { name: 'Example of an order export' });
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((th) => th.textContent);
    expect(headers).toEqual(['Order ID', 'Email', 'Order date', 'Amount']);
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    const emails = exampleRows.map((row) => row[1]);
    expect(new Set(emails).size).toBe(emails.length - 1);
  });

  it('asks for a CSV, and says to save Excel files as CSV first', () => {
    render(<FileRequirements />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('CSV');
    expect(text).toMatch(/Excel.*save it as CSV first/);
    expect(text).toContain('320 MB');
  });

  // The panel must never promise a form the parser refuses.
  it('only shows dates and amounts the app can read', () => {
    expect(exampleHeader).toHaveLength(4);
    for (const date of [...exampleDates, ...exampleRows.map((row) => row[2] ?? '')]) {
      expect(parseDate(date, 'dmy'), date).not.toBeNaN();
    }
    for (const [text, decimal] of [
      ...exampleAmounts,
      ...exampleRows.map((row) => [row[3] ?? '', '.'] as const),
    ]) {
      expect(parseAmount(text, decimal), text).toBeGreaterThan(0);
    }
  });
});
