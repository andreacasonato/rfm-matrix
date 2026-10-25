// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadFile } from './download';
import { Toast } from './Toast';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Toast (APP_FLOW "Export: toast with file name and row count")', () => {
  it('announces its message politely and closes itself after a while', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    render(<Toast message="Exported champions-2026-09-27.csv · 19 customers" onClose={onClose} />);
    expect(screen.getByRole('status').textContent).toContain('19 customers');
    act(() => vi.advanceTimersByTime(6000));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('can be closed by hand', () => {
    const onClose = vi.fn();
    render(<Toast message="Done" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close message' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('downloadFile', () => {
  it('saves a Blob under the given name without any network request', () => {
    const createObjectURL = vi.fn(() => 'blob:local/1');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.useFakeTimers();

    downloadFile(new Blob(['a']), 'champions.csv');
    expect(click).toHaveBeenCalledOnce();
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('champions.csv');
    expect(anchor.href).toBe('blob:local/1');
    act(() => vi.advanceTimersByTime(60_000));
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:local/1');
  });
});
