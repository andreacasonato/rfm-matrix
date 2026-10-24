// Runs one job in a fresh worker from the page. Cancel stops the worker immediately.
import type { UnreadableKind } from '@rfm-matrix/io';
import type {
  AnalysisPlan,
  CsvFormat,
  DoneMessage,
  PreviewDoneMessage,
  PreviewProgressMessage,
  ProgressMessage,
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

function startJob<Done extends WorkerMessage, Progress extends WorkerMessage>(
  request: WorkerRequest,
  doneType: Done['type'],
  progressType: Progress['type'],
  onProgress: (progress: Progress) => void,
): JobHandle<Done> {
  const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), { type: 'module' });
  let cancel = () => {};

  const result = new Promise<Done>((resolve, reject) => {
    const finish = (error?: Error, done?: Done) => {
      worker.terminate();
      if (error) reject(error);
      else if (done) resolve(done);
    };
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
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
  return { result, cancel: () => cancel() };
}

export const startAnalysis = (
  file: Blob,
  plan: AnalysisPlan,
  format: CsvFormat,
  onProgress: (progress: ProgressMessage) => void,
) =>
  startJob<DoneMessage, ProgressMessage>(
    { type: 'start', file, plan, format },
    'done',
    'progress',
    onProgress,
  );

export const startPreview = (
  file: Blob,
  format: CsvFormat,
  onProgress: (progress: PreviewProgressMessage) => void,
) =>
  startJob<PreviewDoneMessage, PreviewProgressMessage>(
    { type: 'preview', file, format },
    'preview-done',
    'preview-progress',
    onProgress,
  );
