// "Upload and preview" (APP_FLOW): is this the right file?
import type { CsvPreview } from '@rfm-matrix/io';
import { useRef, useState } from 'react';
import type { CsvFormat, PreviewDoneMessage } from '../analysis/protocol';
import { type JobHandle, startPreview, WorkerJobError } from '../analysis/worker-client';
import { Button } from '../components/Button';
import { DropZone } from '../components/DropZone';
import { Notice } from '../components/Notice';
import { recordError } from '../diagnostics/diagnostics';
import { FormatControls } from './FormatControls';
import { PreviewTable } from './PreviewTable';
import { describeReadFailure } from './unreadable';

type Props = {
  onBack(): void;
  onContinue(file: File, preview: CsvPreview): void;
  previewFile?: typeof startPreview;
};

type State =
  | { status: 'empty' }
  | { status: 'reading'; file: File; rowsRead: number }
  | { status: 'ready'; file: File; preview: CsvPreview }
  | { status: 'error'; file: File; title: string; detail: string };

const count = (n: number) => n.toLocaleString('en-US');

function describeError(error: unknown, rowsRead: number) {
  recordError(error instanceof Error ? error.message : String(error));
  if (error instanceof WorkerJobError && error.unreadable)
    return describeReadFailure(error.unreadable, rowsRead);
  const message = error instanceof Error ? error.message : String(error);
  return { title: 'This file could not be read', detail: message };
}

export function UploadScreen({ onBack, onContinue, previewFile = startPreview }: Props) {
  const [state, setState] = useState<State>({ status: 'empty' });
  const job = useRef<JobHandle<PreviewDoneMessage> | null>(null);

  function read(file: File, format: CsvFormat = {}) {
    job.current?.cancel();
    setState({ status: 'reading', file, rowsRead: 0 });
    let rowsReached = 0;
    const current = previewFile(file, format, ({ rowsRead }) => {
      rowsReached = rowsRead;
      if (job.current === current) setState({ status: 'reading', file, rowsRead });
    });
    job.current = current;
    current.result.then(
      ({ preview }) => {
        if (job.current === current) setState({ status: 'ready', file, preview });
      },
      (error: unknown) => {
        if (job.current !== current) return;
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({ status: 'error', file, ...describeError(error, rowsReached) });
      },
    );
  }

  function cancel() {
    const current = job.current;
    job.current = null;
    current?.cancel();
    setState({ status: 'empty' });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-title font-semibold">Upload orders</h1>
        <Button variant="quiet" onClick={onBack}>
          Back
        </Button>
      </div>

      {state.status === 'empty' && <DropZone onFile={(file) => read(file)} />}

      {state.status === 'reading' && (
        <section
          aria-busy="true"
          className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-border bg-surface p-6"
        >
          <p>
            Reading <span className="font-semibold">{state.file.name}</span>…{' '}
            <span className="tabular-nums">{count(state.rowsRead)}</span> rows so far
          </p>
          <Button onClick={cancel}>Cancel</Button>
        </section>
      )}

      {state.status === 'error' && (
        <Notice
          tone="error"
          title={state.title}
          actions={
            <Button onClick={() => setState({ status: 'empty' })}>Choose another file</Button>
          }
        >
          <p>
            {state.file.name}: {state.detail}
          </p>
        </Notice>
      )}

      {state.status === 'ready' && (
        <ReadyView
          file={state.file}
          preview={state.preview}
          onFormat={(format) => read(state.file, format)}
          onOther={() => setState({ status: 'empty' })}
          onContinue={() => onContinue(state.file, state.preview)}
        />
      )}
    </>
  );
}

type ReadyProps = {
  file: File;
  preview: CsvPreview;
  onFormat(format: CsvFormat): void;
  onOther(): void;
  onContinue(): void;
};

function ReadyView({ file, preview, onFormat, onOther, onContinue }: ReadyProps) {
  const first = preview.problems[0];
  return (
    <>
      <section className="flex flex-col gap-4 rounded-panel border border-border bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-section font-semibold">{file.name}</p>
          <p className="text-text-secondary">
            <span className="tabular-nums">{count(preview.rowCount)}</span> rows,{' '}
            {preview.header.length} columns
          </p>
        </div>
        <FormatControls
          delimiter={preview.delimiter}
          encoding={preview.encoding}
          onChange={onFormat}
        />
      </section>
      {first && (
        <Notice tone="warning" title={`${count(preview.problems.length)} rows could not be read`}>
          <p>
            Row {count(first.row)}: {first.message}. If many rows look wrong, try another separator
            or text encoding above.
          </p>
        </Notice>
      )}
      {preview.rowCount === 0 && (
        <Notice tone="info" title="This file has column names but no orders">
          <p>Export your orders again, including a date range with orders in it.</p>
        </Notice>
      )}
      <PreviewTable header={preview.header} rows={preview.rows} />
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" disabled={preview.rowCount === 0} onClick={onContinue}>
          Continue
        </Button>
        <Button onClick={onOther}>Choose another file</Button>
      </div>
    </>
  );
}
