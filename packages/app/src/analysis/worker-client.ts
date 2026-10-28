import type { SegmentMap } from '@rfm-matrix/core';
import type {
  AnalysisPlan,
  CsvFormat,
  MovementDoneMessage,
  MoversExportedMessage,
  PreviewDoneMessage,
  PreviewProgressMessage,
  ProgressMessage,
  ProjectExportedMessage,
  ProjectImportedMessage,
  ReadFailure,
  SaveRequest,
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
    readonly unreadable?: ReadFailure,
    readonly tooFewCustomers?: number,
  ) {
    super(message);
    this.name = 'WorkerJobError';
  }
}

type Pending = { resolve(reply: SessionReply): void; reject(error: Error): void };

export function startJob<Done extends WorkerMessage, Progress extends WorkerMessage>(
  request: WorkerRequest,
  doneType: Done['type'],
  progressType: Progress['type'],
  onProgress: (progress: Progress) => void,
  { keepAlive = false } = {},
): JobHandle<Done> & {
  ask(request: DistributiveOmit<SessionRequest | SaveRequest, 'requestId'>): Promise<SessionReply>;
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
        finish(new WorkerJobError(message.message, message.unreadable, message.tooFewCustomers));
      }
    };
    worker.onerror = (event) => {
      finish(new WorkerJobError(event.message || 'The worker stopped unexpectedly'));
    };
    cancel = () => finish(new DOMException('Cancelled', 'AbortError'));
  });

  worker.postMessage(request);
  const ask = (question: DistributiveOmit<SessionRequest | SaveRequest, 'requestId'>) =>
    new Promise<SessionReply>((resolve, reject) => {
      if (stopped) return reject(new DOMException('Cancelled', 'AbortError'));
      const requestId = nextRequest++;
      pending.set(requestId, { resolve, reject });
      worker.postMessage({ ...question, requestId } as SessionRequest | SaveRequest);
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

export type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

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

/** Save project file (S9): the project as a compressed file, built in a worker. */
export const startProjectExport = (projectId: string): JobHandle<ProjectExportedMessage> =>
  startJob<ProjectExportedMessage, ProgressMessage>(
    { type: 'export-project', projectId },
    'project-exported',
    'progress',
    () => {},
  );

/** Open project file (S9): checked and added as a new project, in a worker. */
export const startProjectImport = (file: Blob): JobHandle<ProjectImportedMessage> =>
  startJob<ProjectImportedMessage, ProgressMessage>(
    { type: 'import-project', file },
    'project-imported',
    'progress',
    () => {},
  );

/** Movement between two saved analyses (S10), compared in a worker. */
export const startMovement = (earlierId: string, laterId: string, map: SegmentMap) =>
  startJob<MovementDoneMessage, ProgressMessage>(
    { type: 'movement', earlierId, laterId, map },
    'movement-done',
    'progress',
    () => {},
  );

/** One flow's customers as a CSV (S10, "Export movers"). */
export const startMoversExport = (
  earlierId: string,
  laterId: string,
  map: SegmentMap,
  from: string,
  to: string,
) =>
  startJob<MoversExportedMessage, ProgressMessage>(
    { type: 'export-movers', earlierId, laterId, map, from, to },
    'movers-exported',
    'progress',
    () => {},
  );
