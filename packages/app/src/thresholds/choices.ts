// Score thresholds as a merchant types them (U5): for each dimension, let the app decide
// (quintiles) or set four thresholds of their own (TRD §8 rules 5–7). Only plain numbers are
// accepted; core checks them again in the worker.
import type { Breakpoints, Dimension, ScoringMethods } from '@rfm-matrix/core';

export type ThresholdChoice = { method: 'quantile' | 'fixed'; breaks: string[] };
export type ScoringChoices = Record<Dimension, ThresholdChoice>;

export const defaultScoringChoices: ScoringChoices = {
  r: { method: 'quantile', breaks: ['30', '60', '90', '180'] },
  f: { method: 'fixed', breaks: ['1', '2', '3', '5'] },
  m: { method: 'quantile', breaks: ['', '', '', ''] },
};

// Bounded lengths, so a 4,000-digit paste is refused rather than read as Infinity.
const plain: Record<Dimension, RegExp> = {
  r: /^\d{1,6}$/,
  f: /^\d{1,6}$/,
  m: /^-?\d{1,12}(\.\d{1,2})?$/,
};
const notPlain: Record<Dimension, string> = {
  r: 'Use whole numbers of days, such as 30.',
  f: 'Use whole numbers of orders, such as 3.',
  m: 'Use plain amounts, such as 49.99.',
};
// Recency is listed from score 5 down, with its thresholds rising as the scores fall.
const notRising: Record<Dimension, string> = {
  r: 'Each number of days must be higher than the one for the score above.',
  f: 'Each number of orders must be higher than the one for the score below.',
  m: 'Each amount must be higher than the one for the score below.',
};

/** The four thresholds as numbers, or undefined where one is not a plain number. */
export const parseThresholds = (d: Dimension, breaks: string[]) =>
  breaks.length === 4 && breaks.every((b) => plain[d].test(b))
    ? (breaks.map(Number) as Breakpoints)
    : undefined;

export function thresholdProblems(d: Dimension, breaks: string[]): string[] {
  const numbers = parseThresholds(d, breaks);
  if (!numbers) return [notPlain[d]];
  return numbers.some((b, i) => i > 0 && b <= (numbers[i - 1] ?? b)) ? [notRising[d]] : [];
}

/** The methods, plus problems per dimension; methods is undefined while any is unusable. */
export function scoringFrom(choices: ScoringChoices) {
  const problems = {} as Record<Dimension, string[]>;
  const methods = {} as ScoringMethods;
  for (const d of ['r', 'f', 'm'] as const) {
    const choice = choices[d];
    problems[d] = choice.method === 'quantile' ? [] : thresholdProblems(d, choice.breaks);
    const breaks = parseThresholds(d, choice.breaks);
    methods[d] =
      choice.method === 'fixed' && breaks ? { method: 'fixed', breaks } : { method: 'quantile' };
  }
  const usable = Object.values(problems).every((p) => p.length === 0);
  return { methods: usable ? methods : undefined, problems };
}

/**
 * Own thresholds starting from the app's quintiles. Rounded down to whole days and orders, or to
 * cents, so every customer keeps their score; equal quintiles are nudged one step apart.
 */
export function prefillFrom(d: Dimension, breakpoints: Breakpoints): string[] {
  const step = d === 'm' ? 0.01 : 1;
  const out: number[] = [];
  for (const b of breakpoints) {
    const down = Math.floor(Math.round((b / step) * 1e6) / 1e6) * step;
    const previous = out[out.length - 1];
    out.push(previous !== undefined && down <= previous ? previous + step : down);
  }
  return out.map((v) => String(Math.round(v / step) * step).replace(/(\.\d{2})\d+$/, '$1'));
}
