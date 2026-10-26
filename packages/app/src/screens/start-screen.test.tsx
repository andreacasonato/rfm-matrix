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

  it('lists saved projects, newest first, and opens one', () => {
    const onOpenProject = vi.fn();
    render(
      <StartScreen
        onUpload={() => {}}
        onTrySample={() => {}}
        storage="available"
        projects={[
          {
            id: 'p1',
            name: 'orders-october',
            updatedAt: 0,
            snapshots: 2,
            latest: {
              id: 's2',
              createdAt: 0,
              sourceFileName: 'orders-october.csv',
              analysisDate: '2026-10-01',
              customerCount: 1234,
            },
          },
        ]}
        onOpenProject={onOpenProject}
      />,
    );
    const list = screen.getByRole('list', { name: 'Saved on this device' });
    expect(list.textContent).toContain('orders-october');
    expect(list.textContent).toContain('2 analyses');
    expect(list.textContent).toContain('1,234 customers as of 1 October 2026');
    fireEvent.click(screen.getByRole('button', { name: 'Open orders-october' }));
    expect(onOpenProject).toHaveBeenCalledWith('p1');
  });

  it('shows no list when nothing is saved', () => {
    render(
      <StartScreen onUpload={() => {}} onTrySample={() => {}} storage="available" projects={[]} />,
    );
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('leads to Project and data when the browser keeps data', () => {
    const onProjectData = vi.fn();
    render(
      <StartScreen
        onUpload={() => {}}
        onTrySample={() => {}}
        storage="available"
        onProjectData={onProjectData}
        notice="All data on this device was deleted."
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Project and data' }));
    expect(onProjectData).toHaveBeenCalledOnce();
    expect(screen.getByRole('status').textContent).toContain(
      'All data on this device was deleted.',
    );
  });
});
