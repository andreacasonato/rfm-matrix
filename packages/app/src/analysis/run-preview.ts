// The worker's preview job, kept free of worker globals so it can be tested in Node.
import { previewCsv, UnreadableFileError } from '@rfm-matrix/io';
import type { CsvFormat, WorkerMessage } from './protocol';

const progressEveryMs = 250;

type Options = { now?: () => number; chunkSize?: number };

export async function runPreview(
  file: Blob,
  format: CsvFormat,
  post: (message: WorkerMessage) => void,
  { now = () => performance.now(), chunkSize }: Options = {},
): Promise<void> {
  let lastPostAt = now();
  try {
    const preview = await previewCsv(file, {
      ...format,
      ...(chunkSize === undefined ? {} : { chunkSize }),
      onProgress(rowsRead, bytesRead) {
        const time = now();
        if (time - lastPostAt < progressEveryMs) return;
        lastPostAt = time;
        post({ type: 'preview-progress', rowsRead, bytesRead });
      },
    });
    post({ type: 'preview-done', preview });
  } catch (error) {
    if (error instanceof UnreadableFileError) {
      post({ type: 'error', message: error.message, unreadable: error.kind });
    } else {
      post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
    }
  }
}
