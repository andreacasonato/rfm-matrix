// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenProjectFile } from './OpenProjectFile';

afterEach(cleanup);

async function choose(file: File) {
  const input = document.querySelector('input[type=file]');
  if (!input) throw new Error('no file input');
  await act(async () => fireEvent.change(input, { target: { files: [file] } }));
}

describe('Open project file (S9)', () => {
  it('opens a checked file as a project', async () => {
    const importFile = vi.fn(async () => ({
      ok: true as const,
      projectId: 'p9',
      latestSnapshotId: 's9',
    }));
    const onOpened = vi.fn();
    render(<OpenProjectFile importFile={importFile} onOpened={onOpened} />);
    expect(screen.getByRole('button', { name: 'Open project file' })).toBeTruthy();
    const file = new File(['gz'], 'shop.rfmproject');
    await choose(file);
    expect(importFile).toHaveBeenCalledWith(file);
    expect(onOpened).toHaveBeenCalledWith('p9');
  });

  it('lists what is wrong with a file, as plain text', async () => {
    const importFile = vi.fn(async () => ({
      ok: false as const,
      problems: [
        'project.name must be text.',
        'snapshots[0].customers.r[1] must be a whole number from 1 to 5.',
      ],
    }));
    render(<OpenProjectFile importFile={importFile} onOpened={() => {}} />);
    await choose(new File(['<script>'], 'evil.rfmproject'));
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('evil.rfmproject cannot be opened');
    expect(alert.textContent).toContain('project.name must be text.');
  });
});
