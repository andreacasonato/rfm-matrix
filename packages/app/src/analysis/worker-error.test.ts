import { NotEnoughCustomersError } from '@rfm-matrix/core';
import { UnreadableFileError } from '@rfm-matrix/io';
import { describe, expect, it } from 'vitest';
import { errorMessage } from './worker-error';

describe('errorMessage', () => {
  it('passes on why a file is unreadable', () => {
    expect(errorMessage(new UnreadableFileError('too-large'))).toMatchObject({
      type: 'error',
      unreadable: 'too-large',
    });
  });

  // APP_FLOW's grid warning: TRD §11 blocks scoring under 5 customers, so the page says why.
  it('passes on how many customers there were when too few to score', () => {
    expect(errorMessage(new NotEnoughCustomersError(3))).toMatchObject({
      type: 'error',
      tooFewCustomers: 3,
    });
  });

  it('recognises the errors V8 throws when the worker runs out of memory', () => {
    for (const message of [
      'Array buffer allocation failed',
      'Invalid string length',
      'Invalid array length',
      'Invalid typed array length: 4294967296',
    ]) {
      expect(errorMessage(new RangeError(message))).toEqual({
        type: 'error',
        message,
        unreadable: 'out-of-memory',
      });
    }
  });

  it('keeps any other error as a plain message', () => {
    expect(
      errorMessage(new RangeError('toFixed() digits argument must be between 0 and 100')),
    ).toEqual({ type: 'error', message: 'toFixed() digits argument must be between 0 and 100' });
    expect(errorMessage('boom')).toEqual({ type: 'error', message: 'boom' });
  });
});
