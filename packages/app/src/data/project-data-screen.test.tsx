// @vitest-environment jsdom
import { defaultScoring, defaultSegmentMap } from '@rfm-matrix/core';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LoadedProject } from '../storage/projects';
import { ProjectDataScreen } from './ProjectDataScreen';

afterEach(cleanup);

const project: LoadedProject = {
  project: {
    id: 'p1',
    name: 'my-shop',
    schemaVersion: 1,
    columnMapping: {
      columns: { orderId: 0, customerId: 1, email: 2, orderedAt: 3, amount: 4 },
      read: { decimal: '.', dateOrder: 'dmy' },
      amountLevel: 'order',
    },
    scoringConfig: defaultScoring,
    createdAt: 0,
    updatedAt: 0,
  },
  map: defaultSegmentMap,
  snapshots: [
    {
      id: 's1',
      createdAt: 0,
      sourceFileName: 'sep.csv',
      analysisDate: '2026-09-01',
      customerCount: 900,
      scoring: defaultScoring,
    },
    {
      id: 's2',
      createdAt: 1,
      sourceFileName: 'oct.csv',
      analysisDate: '2026-10-01',
      customerCount: 1200,
      scoring: defaultScoring,
    },
  ],
};

async function setup(deleteAll = vi.fn(async () => {})) {
  const onDeleted = vi.fn();
  render(
    <ProjectDataScreen
      load={async () => [project]}
      estimate={async () => ({ usage: 3_400_000 })}
      deleteAll={deleteAll}
      onBack={() => {}}
      onDeleted={onDeleted}
    />,
  );
  await act(async () => {});
  return { deleteAll, onDeleted };
}

const confirmField = () => screen.getByLabelText('Type DELETE to confirm');

describe('Project and data (APP_FLOW)', () => {
  it('shows what is saved on this device', async () => {
    await setup();
    const text = document.body.textContent ?? '';
    expect(text).toContain('my-shop');
    expect(text).toContain('oct.csv');
    expect(screen.getByRole('table', { name: 'Saved analyses of my-shop' }).textContent).toContain(
      'oct.csv1,200',
    );
    expect(text).toContain('Emails are saved');
    expect(text).toContain('3.4 MB');
  });

  it('deletes all data only after DELETE is typed', async () => {
    const fake = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Delete all data' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete all data?' });
    expect(dialog.textContent).toContain('1 project and 2 saved analyses');
    expect(document.activeElement).toBe(confirmField());
    const confirm = screen.getByRole('button', { name: 'Delete' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(confirmField(), { target: { value: 'delete' } });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(confirmField(), { target: { value: 'DELETE' } });
    await act(async () => fireEvent.click(confirm));
    expect(fake.deleteAll).toHaveBeenCalledOnce();
    expect(fake.onDeleted).toHaveBeenCalledOnce();
  });

  it('closes the dialog with Cancel or Escape, deleting nothing', async () => {
    const fake = await setup();
    fireEvent.click(screen.getByRole('button', { name: 'Delete all data' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Delete all data' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(fake.deleteAll).not.toHaveBeenCalled();
  });

  it('says what to do when another tab holds the data', async () => {
    const deleteAll = vi.fn(async ({ onBlocked }: { onBlocked(): void }) => onBlocked());
    await setup(deleteAll as never);
    fireEvent.click(screen.getByRole('button', { name: 'Delete all data' }));
    fireEvent.change(confirmField(), { target: { value: 'DELETE' } });
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Delete' })));
    expect(screen.getByRole('dialog').textContent).toContain('Close other RFM Matrix tabs');
  });

  it('shows an empty state when nothing is saved', async () => {
    render(
      <ProjectDataScreen
        load={async () => []}
        estimate={async () => ({ usage: 0 })}
        deleteAll={vi.fn()}
        onBack={() => {}}
        onDeleted={() => {}}
      />,
    );
    await act(async () => {});
    expect(document.body.textContent).toContain('Nothing is saved on this device');
  });
});
