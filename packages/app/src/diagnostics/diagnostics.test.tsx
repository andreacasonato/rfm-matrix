// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bugReportUrl } from '../components/ExternalLink';
import { Notice } from '../components/Notice';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { diagnosticsText, recordError, recordRun, resetDiagnostics, scrub } from './diagnostics';

afterEach(cleanup);
beforeEach(resetDiagnostics);

describe('diagnostics (TRD §12)', () => {
  it('lists version, browser, the last run and the last error', () => {
    recordRun({ rowsRead: 1000, rowsUsed: 990, customers: 300, orders: 700, elapsedMs: 812.4 });
    recordError('The worker stopped unexpectedly');
    const text = diagnosticsText({ userAgent: 'TestBrowser/1.0', storage: 'available' });
    expect(text).toContain('RFM Matrix ');
    expect(text).toContain('Browser: TestBrowser/1.0');
    expect(text).toContain('Storage on this device: available');
    expect(text).toContain(
      'Last analysis: 1,000 rows read, 990 used, 300 customers, 700 orders, 812 ms',
    );
    expect(text).toContain('Last error: The worker stopped unexpectedly');
  });

  it('never carries customer data: quoted values and emails are removed', () => {
    expect(scrub('snapshots[0].customers.customerKey[1] repeats customer "Ada Quill".')).toBe(
      'snapshots[0].customers.customerKey[1] repeats customer "…".',
    );
    expect(scrub('Row 4: ada@example.test is not a date')).toBe('Row 4: [email] is not a date');
    recordError('R1 F1 M1 points to an unknown segment "<script>x</script>"; bo@example.test');
    const text = diagnosticsText({ userAgent: 'x', storage: 'available' });
    expect(text).not.toContain('script');
    expect(text).not.toContain('@example.test');
  });

  it('says so when nothing has run yet', () => {
    expect(diagnosticsText({ userAgent: 'x', storage: 'unavailable' })).toContain(
      'Last analysis: none in this tab',
    );
  });
});

describe('the diagnostics panel', () => {
  it('opens from an error notice and copies the text', async () => {
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });
    render(<Notice tone="error" title="Something went wrong" />);
    fireEvent.click(screen.getByText('Diagnostics'));
    expect(screen.getByTestId('diagnostics').textContent).toContain(
      'Last error: Something went wrong',
    );
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Copy diagnostics' })),
    );
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('RFM Matrix'));
    expect(screen.getByRole('status').textContent).toContain('Copied');
  });

  it('links to the bug report form next to Copy diagnostics', () => {
    render(<Notice tone="error" title="Something went wrong" />);
    fireEvent.click(screen.getByText('Diagnostics'));
    expect(
      screen.getByRole('link', { name: 'Report a bug (opens in a new tab)' }).getAttribute('href'),
    ).toBe(bugReportUrl);
  });

  it('is not part of warnings or information', () => {
    render(<Notice tone="warning" title="Careful" />);
    expect(screen.queryByText('Diagnostics')).toBeNull();
  });

  it('can be shown on its own', () => {
    render(<DiagnosticsPanel />);
    expect(screen.getByText('Diagnostics')).toBeTruthy();
  });
});
