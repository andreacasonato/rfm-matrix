// Processing, then the grid; from the grid, any segment's detail and export (S6).

import { defaultSegmentMap } from '@rfm-matrix/core';
import { useEffect, useRef, useState } from 'react';
import type { AnalysisPlan, CsvFormat, DoneMessage, ProgressMessage } from '../analysis/protocol';
import { type AnalysisHandle, startAnalysis, WorkerJobError } from '../analysis/worker-client';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { Toast } from '../components/Toast';
import { GridPage } from '../grid/GridPage';
import { SegmentScreen } from '../segment/SegmentScreen';
import { describeReadFailure } from './unreadable';

type Props = {
  label: string;
  /** The file plus how to read it, loaded when the screen opens. */
  load(): Promise<AnalysisInput>;
  onStartOver(): void;
  analyse?: typeof startAnalysis;
};

export type AnalysisInput = { source: Blob; plan: AnalysisPlan; format: CsvFormat };

type State =
  | { status: 'running'; progress?: ProgressMessage }
  | { status: 'done'; result: DoneMessage; wallMs: number; hasEmail: boolean }
  | { status: 'cancelled' }
  | { status: 'error'; title: string; message: string };

const count = (n: number) => n.toLocaleString('en-US');

const isCancel = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

function failure(error: Error, rowsRead: number): State {
  if (error instanceof WorkerJobError && error.unreadable) {
    const { title, detail } = describeReadFailure(error.unreadable, rowsRead);
    return { status: 'error', title, message: detail };
  }
  return { status: 'error', title: 'Something went wrong', message: error.message };
}

export function ResultsScreen({ label, load, onStartOver, analyse = startAnalysis }: Props) {
  const [state, setState] = useState<State>({ status: 'running' });
  const job = useRef<AnalysisHandle | null>(null);
  const [openSegment, setOpenSegment] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    const started = performance.now();
    load().then(
      ({ source, plan, format }) => {
        if (stopped) return;
        let rowsRead = 0;
        const current = analyse(source, plan, format, (progress) => {
          rowsRead = progress.rowsRead;
          setState({ status: 'running', progress });
        });
        job.current = current;
        current.result.then(
          (result) =>
            setState({
              status: 'done',
              result,
              wallMs: performance.now() - started,
              // The list shows an Email column only when it differs from the customer key; the
              // export keeps it whenever email is mapped, since email tools look for it.
              hasEmail: plan.mapping.email !== undefined && plan.mapping.customerId !== undefined,
            }),
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
  }, [load, analyse]);

  function cancel() {
    job.current?.cancel();
    job.current = null;
    setState({ status: 'cancelled' });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-title font-semibold">{label}</h1>
        <Button variant="quiet" onClick={onStartOver}>
          Start over
        </Button>
      </div>
      {state.status === 'running' && (
        <section
          aria-busy="true"
          className="flex flex-wrap items-center justify-between gap-4 rounded-panel border border-border bg-surface p-6"
        >
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
      {state.status === 'done' && !openSegment && (
        <GridPage result={state.result} wallMs={state.wallMs} onOpenSegment={setOpenSegment} />
      )}
      {state.status === 'done' && openSegment && job.current && (
        <SegmentDetail
          segmentId={openSegment}
          result={state.result}
          hasEmail={state.hasEmail}
          handle={job.current}
          onBack={() => setOpenSegment(null)}
          onExported={setToast}
        />
      )}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </>
  );
}

type DetailProps = {
  segmentId: string;
  result: DoneMessage;
  hasEmail: boolean;
  handle: AnalysisHandle;
  onBack(): void;
  onExported(message: string): void;
};

function SegmentDetail({ segmentId, result, hasEmail, handle, onBack, onExported }: DetailProps) {
  const segment = defaultSegmentMap.segments.find((s) => s.id === segmentId);
  const summary = result.segments.segments.find((s) => s.id === segmentId);
  if (!segment || !summary) return null;
  return (
    <SegmentScreen
      segment={segment}
      summary={summary}
      session={handle.session}
      analysisDate={result.analysisDate}
      hasEmail={hasEmail}
      onBack={onBack}
      onExported={onExported}
    />
  );
}
