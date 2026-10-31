import { describe, expect, it } from 'vitest';
import { defaultScoringChoices, prefillFrom, scoringFrom, thresholdProblems } from './choices';

describe('thresholdProblems (what a merchant typed, in plain words)', () => {
  it('accepts rising whole days and orders, and amounts with up to two decimals', () => {
    expect(thresholdProblems('r', ['30', '60', '90', '180'])).toEqual([]);
    expect(thresholdProblems('f', ['1', '2', '3', '5'])).toEqual([]);
    expect(thresholdProblems('m', ['49.99', '120', '250.5', '1000'])).toEqual([]);
    expect(thresholdProblems('m', ['-20', '0', '10', '20'])).toEqual([]);
  });

  it('refuses anything that is not a plain number', () => {
    for (const hostile of ['1e309', '0x10', 'NaN', 'Infinity', '12,5', ' ', '', '1.234', '--1']) {
      expect(thresholdProblems('m', [hostile, '200', '300', '400'])).toEqual([
        'Use plain amounts, such as 49.99.',
      ]);
    }
    expect(thresholdProblems('r', ['-1', '60', '90', '180'])).toEqual([
      'Use whole numbers of days, such as 30.',
    ]);
    expect(thresholdProblems('f', ['1.5', '2', '3', '5'])).toEqual([
      'Use whole numbers of orders, such as 3.',
    ]);
    expect(thresholdProblems('m', ['9'.repeat(4000), '1', '2', '3'])).toEqual([
      'Use plain amounts, such as 49.99.',
    ]);
  });

  it('asks for each threshold to rise', () => {
    expect(thresholdProblems('m', ['100', '100', '300', '400'])).toEqual([
      'Each amount must be higher than the one for the score below.',
    ]);
    expect(thresholdProblems('r', ['30', '20', '90', '180'])).toEqual([
      'Each number of days must be higher than the one for the score above.',
    ]);
  });
});

describe('scoringFrom', () => {
  it('turns usable choices into scoring methods', () => {
    expect(scoringFrom(defaultScoringChoices).methods).toEqual({
      r: { method: 'quantile' },
      f: { method: 'fixed', breaks: [1, 2, 3, 5] },
      m: { method: 'quantile' },
    });
  });

  it('gives no methods while any threshold is unusable', () => {
    const choices = {
      ...defaultScoringChoices,
      m: { method: 'fixed' as const, breaks: ['1e3', '', '', ''] },
    };
    const { methods, problems } = scoringFrom(choices);
    expect(methods).toBeUndefined();
    expect(problems.m).toEqual(['Use plain amounts, such as 49.99.']);
  });
});

describe('prefillFrom (starting own thresholds from the app’s quintiles)', () => {
  it('rounds down, so every customer keeps the score the quintiles gave', () => {
    // Whole days: a recency of 37 is "up to 37.6", so 37 keeps it in the same score.
    expect(prefillFrom('r', [12.5, 37.6, 90, 200])).toEqual(['12', '37', '90', '200']);
    expect(prefillFrom('m', [49.999, 120.456, 250, 1000.1])).toEqual([
      '49.99',
      '120.45',
      '250',
      '1000.1',
    ]);
  });

  it('nudges equal quintiles apart so the thresholds can be used straight away', () => {
    expect(prefillFrom('f', [1, 1, 1, 3])).toEqual(['1', '2', '3', '4']);
    expect(prefillFrom('m', [20, 20, 55.5, 120])).toEqual(['20', '20.01', '55.5', '120']);
  });
});
