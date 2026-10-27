// @vitest-environment jsdom
import type { CsvPreview } from '@rfm-matrix/io';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OnboardingScreen } from './OnboardingScreen';

afterEach(cleanup);

const preview: CsvPreview = {
  header: ['Name', 'Email', 'Financial Status', 'Created at', 'Total', 'Lineitem name'],
  rows: [['#1001', 'a@example.test', 'paid', '2026-04-03 10:00:00 +0000', '30.00', 'Mug']],
  rowCount: 1,
  delimiter: ',',
  encoding: 'utf-8',
  problems: [],
};

const setup = () => {
  const onDone = vi.fn();
  const onSkip = vi.fn();
  render(
    <OnboardingScreen fileName="orders.csv" preview={preview} onDone={onDone} onSkip={onSkip} />,
  );
  return { onDone, onSkip };
};

describe('First-upload questions (S11, APP_FLOW "Onboarding")', () => {
  it('asks three questions, starting from what the file shows', () => {
    setup();
    expect(screen.getAllByRole('group')).toHaveLength(3);
    expect(screen.getByLabelText(/Shopify/)).toHaveProperty('checked', true);
    expect(screen.getByLabelText(/Shopify/).closest('label')?.textContent).toContain(
      "matches this file's columns",
    );
    expect(screen.getByLabelText(/One total per order/)).toHaveProperty('checked', true);
    expect(screen.getByLabelText(/Day after the latest order/)).toHaveProperty('checked', true);
  });

  it('passes the answers on to the next steps', () => {
    const fake = setup();
    fireEvent.click(screen.getByLabelText(/Other shop or spreadsheet/));
    fireEvent.click(screen.getByLabelText(/Each row is a product line/));
    fireEvent.click(screen.getByLabelText(/Today/));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(fake.onDone).toHaveBeenCalledWith({
      preset: 'other',
      amountLevel: 'line',
      dateMode: 'today',
      customDate: '',
    });
  });

  it('needs a date before continuing with "Another date"', () => {
    const fake = setup();
    fireEvent.click(screen.getByLabelText('Another date'));
    const next = screen.getByRole('button', { name: 'Continue' });
    expect(next).toHaveProperty('disabled', true);
    fireEvent.change(screen.getByLabelText('Analysis date'), { target: { value: '2026-09-30' } });
    fireEvent.click(next);
    expect(fake.onDone).toHaveBeenCalledWith(
      expect.objectContaining({ dateMode: 'custom', customDate: '2026-09-30' }),
    );
  });

  it('can be skipped', () => {
    const fake = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Skip questions' }));
    expect(fake.onSkip).toHaveBeenCalledOnce();
  });
});
