// @vitest-environment jsdom
import {
  defaultSegmentMap,
  maxMapFileLength,
  type SegmentMap,
  segmentFor,
  segmentMapToFile,
  setCell,
} from '@rfm-matrix/core';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RulesFileActions } from './RulesFileActions';

afterEach(cleanup);

function setup() {
  const onOpen = vi.fn();
  const download = vi.fn();
  const { container } = render(
    <RulesFileActions
      map={defaultSegmentMap}
      base={defaultSegmentMap}
      onOpen={onOpen}
      download={download}
    />,
  );
  const open = async (file: File) => {
    const input = container.querySelector('input[type=file]');
    if (!input) throw new Error('no file input');
    await act(async () => fireEvent.change(input, { target: { files: [file] } }));
  };
  return { onOpen, download, open };
}

describe('rules files on the Segment rules screen (S7)', () => {
  it('exports the rules as a JSON file', async () => {
    const fake = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Export rules' }));
    const [file, name] = fake.download.mock.calls[0] ?? [];
    expect(name).toBe('segment-rules.json');
    expect(await (file as Blob).text()).toBe(segmentMapToFile(defaultSegmentMap));
  });

  it('opens a rules file as a change', async () => {
    const fake = setup();
    const edited = setCell(defaultSegmentMap, { r: 5, f: 1, m: 'all' }, 'champions');
    await fake.open(new File([segmentMapToFile(edited)], 'mine.json'));
    const [map, message] = fake.onOpen.mock.calls[0] ?? [];
    expect(segmentFor(map as SegmentMap, 5, 1, 1)).toBe('champions');
    expect(message).toBe('Rules opened from mine.json.');
  });

  it('shows what is wrong with a hostile file, as plain text only', async () => {
    const fake = setup();
    const cells = [...defaultSegmentMap.cells];
    cells[0] = '<img src=x onerror="window.hacked=1">';
    const text = JSON.stringify({ format: 'rfm-matrix-segment-map', version: 1, cells });
    await fake.open(new File([text], 'evil.json'));
    expect(fake.onOpen).not.toHaveBeenCalled();
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('evil.json cannot be used');
    expect(alert.textContent).toContain('R1 F1 M1 points to an unknown segment "<img src=x');
    expect(alert.querySelector('img')).toBeNull();
  });

  it('refuses an oversized file without reading it', async () => {
    const fake = setup();
    const file = new File(['x'], 'huge.json');
    Object.defineProperty(file, 'size', { value: maxMapFileLength + 1 });
    const text = vi.spyOn(file, 'text');
    await fake.open(file);
    expect(text).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('too large to be a rules file');
  });
});
