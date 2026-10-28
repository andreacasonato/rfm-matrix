// Turns an error inside a worker job into the message the page receives. Running out of memory
// is told apart, so the page can say "too large for your browser", and so are too few customers
// to score (TRD §11).
import { NotEnoughCustomersError } from '@rfm-matrix/core';
import { UnreadableFileError } from '@rfm-matrix/io';
import type { ErrorMessage } from './protocol';

// What V8 throws when an allocation is refused; the tab itself may survive.
const outOfMemory = /allocation failed|^Invalid (?:string|array|typed array) length/;

export function errorMessage(error: unknown): ErrorMessage {
  if (error instanceof UnreadableFileError) {
    return { type: 'error', message: error.message, unreadable: error.kind };
  }
  if (error instanceof NotEnoughCustomersError) {
    return { type: 'error', message: error.message, tooFewCustomers: error.customerCount };
  }
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof RangeError && outOfMemory.test(message)) {
    return { type: 'error', message, unreadable: 'out-of-memory' };
  }
  return { type: 'error', message };
}
