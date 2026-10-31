// @vitest-environment jsdom
import { defaultScoring, defaultSegmentMap } from '@rfm-matrix/core';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { LoadedProject } from '../storage/projects';
import { ProjectSection } from './ProjectSection';

afterEach(cleanup);

const loaded = (email: boolean): LoadedProject => ({
  project: {
    id: 'p1',
    name: 'my-shop',
    schemaVersion: 1,
    columnMapping: {
      columns: {
        orderId: 0,
        customerId: 1,
        orderedAt: 3,
        amount: 4,
        ...(email ? { email: 2 } : {}),
      },
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
      sourceFileName: 'oct.csv',
      analysisDate: '2026-10-01',
      customerCount: 12,
      scoring: defaultScoring,
    },
  ],
});

function setup(
  email: boolean,
  exportFile = vi.fn(async () => ({
    file: new Blob(['gz']),
    name: 'my-shop.rfmproject',
    hasEmail: email,
  })),
) {
  const download = vi.fn();
  render(<ProjectSection loaded={loaded(email)} exportFile={exportFile} download={download} />);
  return { exportFile, download };
}

describe('Save project file (S9, APP_FLOW "Project and data")', () => {
  it('saves the project as a file and says so', async () => {
    const fake = setup(false);
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Save project file' })),
    );
    expect(fake.exportFile).toHaveBeenCalledWith('p1');
    expect(fake.download).toHaveBeenCalledWith(expect.any(Blob), 'my-shop.rfmproject');
    expect(screen.getByRole('status').textContent).toContain('Saved my-shop.rfmproject');
  });

  it("warns that the file holds customers' emails when they were mapped", () => {
    setup(true);
    expect(document.body.textContent).toContain("The file will contain your customers' emails");
    cleanup();
    setup(false);
    expect(document.body.textContent).not.toContain("will contain your customers' emails");
  });

  it('explains a failure', async () => {
    setup(
      false,
      vi.fn(async () => Promise.reject(new Error('The worker stopped unexpectedly'))),
    );
    await act(async () =>
      fireEvent.click(screen.getByRole('button', { name: 'Save project file' })),
    );
    expect(screen.getByRole('alert').textContent).toContain('The worker stopped unexpectedly');
  });
});
