import { defaultScoring } from '@rfm-matrix/core';
import { describe, expect, it } from 'vitest';
import { describeScoring } from './describe-scoring';

describe('describeScoring (PRD story 4: the method used is shown)', () => {
  it('describes the default', () => {
    expect(describeScoring(defaultScoring)).toBe(
      "Recency: quintiles (as Excel's PERCENTILE.INC). Frequency: fixed cut points at 1, 2, 3 and 5 orders. Monetary: quintiles (as Excel's PERCENTILE.INC).",
    );
  });

  it('describes fixed recency and quintile frequency', () => {
    expect(
      describeScoring({
        r: { method: 'fixed', breaks: [30, 60, 90, 180] },
        f: { method: 'quantile' },
        m: { method: 'fixed', breaks: [50, 100, 250.5, 1000] },
      }),
    ).toBe(
      "Recency: fixed cut points at 30, 60, 90 and 180 days. Frequency: quintiles (as Excel's PERCENTILE.INC). Monetary: fixed cut points at 50, 100, 250.50 and 1,000.",
    );
  });
});
