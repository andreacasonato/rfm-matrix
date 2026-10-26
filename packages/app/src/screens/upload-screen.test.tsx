// @vitest-environment jsdom
import type { CsvPreview } from '@rfm-matrix/io';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PreviewDoneMessage, PreviewProgressMessage } from '../analysis/protocol';
import { WorkerJobError } from '../analysis/worker-client';
import { UploadScreen } from './UploadScreen';

afterEach(cleanup);

const preview = (overrides: Partial<CsvPreview> = {}): CsvPreview => ({
  header: ['Name', 'Email', 'Total'],
  rows: Array.from({ length: 20 }, (_, i) => [`#${1001 + i}`, `c${i}@example.test`, '9.00']),
  rowCount: 1234,
  delimiter: ',',
  encoding: 'utf-8',
  problems: [],
  ...overrides,
});

function fakePreview() {
  const calls: { format: object; resolve(p: CsvPreview): void; reject(e: Error): void }[] = [];
  const cancel = vi.fn();
  let progress: (p: PreviewProgressMessage) => void = () => {};
  const previewFile = vi.fn((_file: Blob, format: object, onProgress: typeof progress) => {
    progress = onProgress;
    const result = new Promise<PreviewDoneMessage>((resolve, reject) => {
      calls.push({
        format,
        resolve: (p) => resolve({ type: 'preview-done', preview: p }),
        reject,
      });
    });
    return { result, cancel };
  });
  return { previewFile, calls, cancel, progress: (p: PreviewProgressMessage) => progress(p) };
}

const file = new File(['x'], 'orders.csv', { type: 'text/csv' });

function chooseFile(container: HTMLElement) {
  const input = container.querySelector('input[type=file]');
  if (!input) throw new Error('no file input');
  fireEvent.change(input, { target: { files: [file] } });
}

describe('UploadScreen', () => {
  it('starts empty, with the drop zone', () => {
    render(<UploadScreen onBack={() => {}} onContinue={() => {}} previewFile={vi.fn()} />);
    expect(screen.getByTestId('drop-zone')).toBeTruthy();
  });

  it('shows a live row counter while reading, and Cancel returns to the drop zone', async () => {
    const fake = fakePreview();
    const { container } = render(
      <UploadScreen onBack={() => {}} onContinue={() => {}} previewFile={fake.previewFile} />,
    );
    chooseFile(container);
    act(() => fake.progress({ type: 'preview-progress', rowsRead: 50_000, bytesRead: 1 }));
    expect(document.body.textContent).toContain('50,000 rows so far');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(fake.cancel).toHaveBeenCalledOnce();
    expect(screen.getByTestId('drop-zone')).toBeTruthy();
  });

  it('shows the file name, row count and first 20 rows, then continues with the preview', async () => {
    const fake = fakePreview();
    const onContinue = vi.fn();
    const { container } = render(
      <UploadScreen onBack={() => {}} onContinue={onContinue} previewFile={fake.previewFile} />,
    );
    chooseFile(container);
    await act(async () => fake.calls[0]?.resolve(preview()));
    expect(screen.getByText('orders.csv')).toBeTruthy();
    expect(document.body.textContent).toContain('1,234 rows, 3 columns');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(20);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(onContinue).toHaveBeenCalledWith(file, preview());
  });

  it('warns about rows that could not be read', async () => {
    const fake = fakePreview();
    const { container } = render(
      <UploadScreen onBack={() => {}} onContinue={() => {}} previewFile={fake.previewFile} />,
    );
    chooseFile(container);
    const problems = [{ row: 12, message: 'Quoted field unterminated' }];
    await act(async () => fake.calls[0]?.resolve(preview({ problems })));
    expect(screen.getByRole('status').textContent).toContain('Row 12');
  });

  it('reads the file again with a delimiter chosen by the user', async () => {
    const fake = fakePreview();
    const { container } = render(
      <UploadScreen onBack={() => {}} onContinue={() => {}} previewFile={fake.previewFile} />,
    );
    chooseFile(container);
    await act(async () => fake.calls[0]?.resolve(preview()));
    fireEvent.change(screen.getByLabelText('Separator'), { target: { value: ';' } });
    expect(fake.calls[1]?.format).toEqual({ encoding: 'utf-8', delimiter: ';' });
  });

  it('explains how to save an Excel file as CSV', async () => {
    const fake = fakePreview();
    const { container } = render(
      <UploadScreen onBack={() => {}} onContinue={() => {}} previewFile={fake.previewFile} />,
    );
    chooseFile(container);
    await act(async () => fake.calls[0]?.reject(new WorkerJobError('x', 'xlsx')));
    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Excel');
    expect(alert.textContent).toContain('CSV');
    expect(screen.getByRole('button', { name: 'Choose another file' })).toBeTruthy();
  });

  it('shows other read errors with their message', async () => {
    const fake = fakePreview();
    const { container } = render(
      <UploadScreen onBack={() => {}} onContinue={() => {}} previewFile={fake.previewFile} />,
    );
    chooseFile(container);
    await act(async () => fake.calls[0]?.reject(new WorkerJobError('Disk read failed')));
    expect(screen.getByRole('alert').textContent).toContain('Disk read failed');
  });

  it('explains the size limit and what to do about it', async () => {
    const fake = fakePreview();
    const { container } = render(
      <UploadScreen onBack={() => {}} onContinue={() => {}} previewFile={fake.previewFile} />,
    );
    chooseFile(container);
    await act(async () => fake.calls[0]?.reject(new WorkerJobError('x', 'too-large')));
    const alert = screen.getByRole('alert').textContent;
    expect(alert).toContain('larger than 320 MB');
    expect(alert).toContain('shorter date range');
  });

  it('says the file is too large for the browser, with the rows reached', async () => {
    const fake = fakePreview();
    const { container } = render(
      <UploadScreen onBack={() => {}} onContinue={() => {}} previewFile={fake.previewFile} />,
    );
    chooseFile(container);
    act(() => fake.progress({ type: 'preview-progress', rowsRead: 800_000, bytesRead: 1 }));
    await act(async () => fake.calls[0]?.reject(new WorkerJobError('x', 'out-of-memory')));
    const alert = screen.getByRole('alert').textContent;
    expect(alert).toContain('too large for your browser');
    expect(alert).toContain('after 800,000 rows');
  });
});
