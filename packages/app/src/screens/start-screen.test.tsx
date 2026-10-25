// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StartScreen } from './StartScreen';

afterEach(cleanup);

describe('StartScreen', () => {
  it('offers Upload orders and Try sample data, with the privacy promise', () => {
    const onUpload = vi.fn();
    const onTrySample = vi.fn();
    render(<StartScreen onUpload={onUpload} onTrySample={onTrySample} storage="available" />);
    fireEvent.click(screen.getByRole('button', { name: 'Upload orders' }));
    fireEvent.click(screen.getByRole('button', { name: 'Try sample data' }));
    expect(onUpload).toHaveBeenCalledOnce();
    expect(onTrySample).toHaveBeenCalledOnce();
    expect(screen.getByText(/never leave/)).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('warns that nothing will be saved when browser storage is unavailable', () => {
    render(<StartScreen onUpload={() => {}} onTrySample={() => {}} storage="unavailable" />);
    expect(screen.getByRole('status').textContent).toContain('nothing will be saved');
  });
});
