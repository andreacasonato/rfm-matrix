// Turns an error inside a worker job into the message the page receives. Running out of memory
// is told apart, so the page can say "too large for your browser" (TRD §11).
import { UnreadableFileError } from '@rfm-matrix/io';
import type { ErrorMessage } from './protocol';

// What V8 throws when an allocation is refused; the tab itself may survive.
const outOfMemory = /allocation failed|^Invalid (?:string|array|typed array) length/;

export function errorMessage(error: unknown): ErrorMessage {
  if (error instanceof UnreadableFileError) {
    return { type: 'error', message: error.message, unreadable: error.kind };
  }
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof RangeError && outOfMemory.test(message)) {
    return { type: 'error', message, unreadable: 'out-of-memory' };
  }
  return { type: 'error', message };
}
