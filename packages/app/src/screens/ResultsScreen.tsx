// Processing, then the finished analysis (AnalysisView), or why it stopped.

import type { SegmentMap } from '@rfm-matrix/core';
import { useEffect, useRef, useState } from 'react';
import { type AnalysisHandle, openSnapshot, startAnalysis } from '../analysis/analysis-client';
import type { AnalysisPlan, CsvFormat, DoneMessage, ProgressMessage } from '../analysis/protocol';
import { WorkerJobError } from '../analysis/worker-client';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { ProgressBar } from '../components/ProgressBar';
import { recordError, recordRun } from '../diagnostics/diagnostics';
import { AnalysisView, type ProjectContext } from './AnalysisView';
import { plural } from './plural';
import { describeReadFailure } from './unreadable';

type Props = {
  label: string;
  /** The file plus how to read it, loaded when the screen opens. */
  load(): Promise<AnalysisInput>;
  onStartOver(): void;
  /** The project this analysis is saved in or opened from (S8); none for the sample. */
  project?: ProjectContext;
  analyse?: typeof startAnalysis;
  open?: typeof openSnapshot;
  /** Adds a new export to this saved project (journey 4). */
  onUploadNew?(): void;
};

/** A file to read, or a saved snapshot to open (S8). */
export type AnalysisInput =
  | { source: Blob; plan: AnalysisPlan; format: CsvFormat }
  | { snapshotId: string; map: SegmentMap; hasEmail: boolean };

type State =
  | { status: 'running'; progress?: ProgressMessage; fileBytes?: number }
  | { status: 'done'; result: DoneMessage; wallMs: number; hasEmail: boolean }
  | { status: 'cancelled' }
  | { status: 'error'; title: string; message: string };

const count = (n: number) => n.toLocaleString('en-US');

const isCancel = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

function failure(error: Error, rowsRead: number): State {
  recordError(error.message);
  if (error instanceof WorkerJobError && error.unreadable) {
    const { title, detail } = describeReadFailure(error.unreadable, rowsRead);
    return { status: 'error', title, message: detail };
  }
  if (error instanceof WorkerJobError && error.tooFewCustomers !== undefined) {
    return {
      status: 'error',
      title: 'Too few customers to score',
      message: `This file has ${plural(error.tooFewCustomers, 'customer')} left after cleaning. Scores rank customers against each other, so they need at least 5. Check the status filters and lookback on Clean and settings, or export a longer date range.`,
    };
  }
  return { status: 'error', title: 'Something went wrong', message: error.message };
}

export function ResultsScreen({
  label,
  load,
  onStartOver,
  project,
  analyse = startAnalysis,
  open = openSnapshot,
  onUploadNew,
}: Props) {
  const [state, setState] = useState<State>({ status: 'running' });
  const job = useRef<AnalysisHandle | null>(null);

  useEffect(() => {
    let stopped = false;
    const started = performance.now();
    load().then(
      (input) => {
        if (stopped) return;
        let rowsRead = 0;
        const fileBytes = 'source' in input ? input.source.size : undefined;
        const onProgress = (progress: ProgressMessage) => {
          rowsRead = progress.rowsRead;
          setState({ status: 'running', progress, ...(fileBytes ? { fileBytes } : {}) });
        };
        const current =
          'snapshotId' in input
            ? open(input.snapshotId, input.map, onProgress)
            : analyse(input.source, input.plan, input.format, onProgress);
        // The list shows an Email column only when it differs from the customer key; the
        // export keeps it whenever email is mapped, since email tools look for it.
        const hasEmail =
          'snapshotId' in input
            ? input.hasEmail
            : input.plan.mapping.email !== undefined && input.plan.mapping.customerId !== undefined;
        job.current = current;
        current.result.then(
          (result) => {
            recordRun(result);
            setState({
              status: 'done',
              result,
              wallMs: performance.now() - started,
              hasEmail,
            });
          },
          (error: Error) => {
            // Cancel rejects the job too; the cancel button has already updated the screen.
            if (!stopped && !isCancel(error)) setState(failure(error, rowsRead));
          },
        );
      },
      (error: Error) => setState(failure(error, 0)),
    );
    return () => {
      stopped = true;
      job.current?.cancel();
    };
  }, [load, analyse, open]);

  function cancel() {
    job.current?.cancel();
    job.current = null;
    setState({ status: 'cancelled' });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-title font-semibold break-words">{label}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {onUploadNew && state.status === 'done' && (
            <Button onClick={onUploadNew}>Upload new export</Button>
          )}
          <Button variant="quiet" onClick={onStartOver}>
            Start over
          </Button>
        </div>
      </div>
      {state.status === 'running' && (
        <section
          aria-busy="true"
          className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-border bg-surface p-6"
        >
          <ProgressBar
            label="Running analysis"
            done={state.progress?.bytesRead ?? 0}
            {...(state.fileBytes ? { total: state.fileBytes } : {})}
          />
          <p>
            Running analysis…{' '}
            <span className="tabular-nums">{count(state.progress?.rowsRead ?? 0)}</span> rows,{' '}
            <span className="tabular-nums">{count(state.progress?.customers ?? 0)}</span> customers
            found
          </p>
          <Button onClick={cancel}>Cancel</Button>
        </section>
      )}
      {state.status === 'cancelled' && (
        <Notice
          tone="info"
          title="Analysis cancelled"
          actions={<Button onClick={onStartOver}>Start over</Button>}
        />
      )}
      {state.status === 'error' && (
        <Notice
          tone="error"
          title={state.title}
          actions={<Button onClick={onStartOver}>Start over</Button>}
        >
          <p>{state.message}</p>
        </Notice>
      )}
      {state.status === 'done' && job.current && (
        <AnalysisView
          result={state.result}
          wallMs={state.wallMs}
          hasEmail={state.hasEmail}
          handle={job.current}
          {...(project ? { project } : {})}
        />
      )}
    </>
  );
}
