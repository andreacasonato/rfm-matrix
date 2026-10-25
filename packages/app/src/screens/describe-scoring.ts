// The scoring method in words, shown with the results (PRD story 4).
import type { Dimension, DimensionMethod, ScoringMethods } from '@rfm-matrix/core';
import { formatAmount } from './format';

const names: Record<Dimension, string> = { r: 'Recency', f: 'Frequency', m: 'Monetary' };
const units: Record<Dimension, string> = { r: ' days', f: ' orders', m: '' };

function describe(dimension: Dimension, method: DimensionMethod): string {
  if (method.method === 'quantile')
    return `${names[dimension]}: quintiles (as Excel's PERCENTILE.INC).`;
  const shown = method.breaks.map((b) =>
    dimension === 'm' ? formatAmount(b).replace(/\.00$/, '') : b.toLocaleString('en-US'),
  );
  const list = `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}`;
  return `${names[dimension]}: fixed cut points at ${list}${units[dimension]}.`;
}

export function describeScoring(scoring: ScoringMethods): string {
  return (['r', 'f', 'm'] as const).map((d) => describe(d, scoring[d])).join(' ');
}
