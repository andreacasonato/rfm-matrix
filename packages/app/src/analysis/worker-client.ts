// Runs one job in a fresh worker from the page. Cancel stops the worker immediately.
import type { UnreadableKind } from '@rfm-matrix/io';
import type { SegmentPage, Sort } from '../segment/customer-table';
import type {
  AnalysisPlan,
  CsvFormat,
  DoneMessage,
  PreviewDoneMessage,
  PreviewProgressMessage,
  ProgressMessage,
  SessionReply,
  SessionRequest,
  SummaryDoneMessage,
  SummaryProgressMessage,
  WorkerMessage,
  WorkerRequest,
} from './protocol';

export type JobHandle<T> = { result: Promise<T>; cancel(): void };

/** An error from the worker; `unreadable` says why a file could not be read at all. */
export class WorkerJobError extends Error {
  constructor(
    message: string,
    readonly unreadable?: UnreadableKind,
  ) {
    super(message);
    this.name = 'WorkerJobError';
  }
}

/** Questions about a finished analysis, answered by the worker that ran it (S6). */
export type AnalysisSession = {
  segmentPage(segmentId: string, sort: Sort, page: number, pageSize: number): Promise<SegmentPage>;
  exportSegment(segmentId: string, segmentName: string): Promise<{ file: Blob; rows: number }>;
};

type Pending = { resolve(reply: SessionReply): void; reject(error: Error): void };

function startJob<Done extends WorkerMessage, Progress extends WorkerMessage>(
  request: WorkerRequest,
  doneType: Done['type'],
  progressType: Progress['type'],
  onProgress: (progress: Progress) => void,
  { keepAlive = false } = {},
): JobHandle<Done> & {
  ask(request: DistributiveOmit<SessionRequest, 'requestId'>): Promise<SessionReply>;
} {
  const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
  let cancel = () => {};
  let stopped = false;
  let nextRequest = 1;
  const pending = new Map<number, Pending>();
  const stop = () => {
    stopped = true;
    worker.terminate();
    for (const p of pending.values()) p.reject(new DOMException('Cancelled', 'AbortError'));
    pending.clear();
  };

  const result = new Promise<Done>((resolve, reject) => {
    const finish = (error?: Error, done?: Done) => {
      if (error || !keepAlive) stop();
      if (error) reject(error);
      else if (done) resolve(done);
    };
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if ('requestId' in message && message.requestId !== undefined) {
        const waiting = pending.get(message.requestId);
        pending.delete(message.requestId);
        if (message.type === 'error') waiting?.reject(new WorkerJobError(message.message));
        else waiting?.resolve(message);
        return;
      }
      if (message.type === progressType) onProgress(message as Progress);
      else if (message.type === doneType) finish(undefined, message as Done);
      else if (message.type === 'error') {
        finish(new WorkerJobError(message.message, message.unreadable));
      }
    };
    worker.onerror = (event) => {
      finish(new WorkerJobError(event.message || 'The worker stopped unexpectedly'));
    };
    cancel = () => finish(new DOMException('Cancelled', 'AbortError'));
  });

  worker.postMessage(request);
  const ask = (question: DistributiveOmit<SessionRequest, 'requestId'>) =>
    new Promise<SessionReply>((resolve, reject) => {
      if (stopped) return reject(new DOMException('Cancelled', 'AbortError'));
      const requestId = nextRequest++;
      pending.set(requestId, { resolve, reject });
      worker.postMessage({ ...question, requestId } as SessionRequest);
    });
  // Before the result: cancels the job. After it (analysis sessions): closes the worker.
  return {
    result,
    cancel: () => {
      if (!stopped) cancel();
    },
    ask,
  };
}

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export type AnalysisHandle = JobHandle<DoneMessage> & { session: AnalysisSession };

/** Runs an analysis; the worker stays open for segment questions until cancel() closes it. */
export function startAnalysis(
  file: Blob,
  plan: AnalysisPlan,
  format: CsvFormat,
  onProgress: (progress: ProgressMessage) => void,
): AnalysisHandle {
  const job = startJob<DoneMessage, ProgressMessage>(
    { type: 'start', file, plan, format },
    'done',
    'progress',
    onProgress,
    { keepAlive: true },
  );
  const session: AnalysisSession = {
    async segmentPage(segmentId, sort, page, pageSize) {
      const reply = await job.ask({ type: 'segment-page', segmentId, sort, page, pageSize });
      if (reply.type !== 'segment-page-done') throw new WorkerJobError('Unexpected reply');
      return reply.page;
    },
    async exportSegment(segmentId, segmentName) {
      const reply = await job.ask({ type: 'export', segmentId, segmentName });
      if (reply.type !== 'export-done') throw new WorkerJobError('Unexpected reply');
      return { file: reply.file, rows: reply.rows };
    },
  };
  return { result: job.result, cancel: job.cancel, session };
}

export const startPreview = (
  file: Blob,
  format: CsvFormat,
  onProgress: (progress: PreviewProgressMessage) => void,
): JobHandle<PreviewDoneMessage> =>
  startJob<PreviewDoneMessage, PreviewProgressMessage>(
    { type: 'preview', file, format },
    'preview-done',
    'preview-progress',
    onProgress,
  );

export const startSummary = (
  file: Blob,
  plan: AnalysisPlan,
  format: CsvFormat,
  onProgress: (progress: SummaryProgressMessage) => void,
): JobHandle<SummaryDoneMessage> =>
  startJob<SummaryDoneMessage, SummaryProgressMessage>(
    { type: 'summary', file, plan, format },
    'summary-done',
    'summary-progress',
    onProgress,
  );
