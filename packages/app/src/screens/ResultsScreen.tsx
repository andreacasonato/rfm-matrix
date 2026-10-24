// Processing, then the segment counts. The styled grid replaces the list in slice S5.
import { useEffect, useRef, useState } from 'react';
import type { ColumnNames, CsvFormat, DoneMessage, ProgressMessage } from '../analysis/protocol';
import { type JobHandle, startAnalysis } from '../analysis/worker-client';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { SegmentList } from '../SegmentList';

type Props = {
  label: string;
  load(): Promise<Blob>;
  format: CsvFormat;
  columns: ColumnNames;
  onStartOver(): void;
  analyse?: typeof startAnalysis;
};

type State =
  | { status: 'running'; progress?: ProgressMessage }
  | { status: 'done'; result: DoneMessage; wallMs: number }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

const count = (n: number) => n.toLocaleString('en-US');

const isCancel = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

export function ResultsScreen({
  label,
  load,
  format,
  columns,
  onStartOver,
  analyse = startAnalysis,
}: Props) {
  const [state, setState] = useState<State>({ status: 'running' });
  const job = useRef<JobHandle<DoneMessage> | null>(null);

  useEffect(() => {
    let stopped = false;
    const started = performance.now();
    load().then(
      (source) => {
        if (stopped) return;
        const current = analyse(source, columns, format, (progress) =>
          setState({ status: 'running', progress }),
        );
        job.current = current;
        current.result.then(
          (result) => setState({ status: 'done', result, wallMs: performance.now() - started }),
          (error: Error) => {
            // Cancel rejects the job too; the cancel button has already updated the screen.
            if (!stopped && !isCancel(error)) setState({ status: 'error', message: error.message });
          },
        );
      },
      (error: Error) => setState({ status: 'error', message: error.message }),
    );
    return () => {
      stopped = true;
      job.current?.cancel();
    };
  }, [load, columns, format, analyse]);

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
            <span className="font-mono text-number">{count(state.progress?.rowsRead ?? 0)}</span>{' '}
            rows,{' '}
            <span className="font-mono text-number">{count(state.progress?.customers ?? 0)}</span>{' '}
            customers found
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
          title="Something went wrong"
          actions={<Button onClick={onStartOver}>Start over</Button>}
        >
          <p>{state.message}</p>
        </Notice>
      )}
      {state.status === 'done' && (
        <>
          <output
            data-status="done"
            data-wall-ms={state.wallMs}
            data-result={JSON.stringify(state.result)}
            className="text-text-secondary"
          >
            {count(state.result.rowsRead)} rows read ({count(state.result.invalidRows)} unusable),{' '}
            {count(state.result.customers)} customers, {count(state.result.orders)} orders, in{' '}
            {(state.wallMs / 1000).toFixed(2)} s.
          </output>
          <p className="text-text-secondary">
            Analysed as of {state.result.analysisDate}. Recency and monetary scores use quintiles
            (as Excel's PERCENTILE.INC); frequency uses fixed breaks of 1, 2, 3, 4–5 and 6+ orders.
          </p>
          <SegmentList summary={state.result.segments} />
        </>
      )}
    </>
  );
}
