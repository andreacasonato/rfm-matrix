// One dimension's score thresholds in plain words (U5): what a customer needs for each score
// from 5 to 1, either decided by the app (quintiles) or typed by the merchant. Used on Clean and
// settings before an analysis, and on Score thresholds after one, where it also shows counts.
import type { BinSizes, Breakpoints, Dimension } from '@rfm-matrix/core';
import { scoreRanges } from '../how/score-ranges';
import { parseThresholds, prefillFrom, type ThresholdChoice, thresholdProblems } from './choices';

type Copy = { name: string; what: string; own: string; ask: string; before: string; after: string };
const copy: Record<Dimension, Copy> = {
  r: {
    name: 'Recency',
    what: 'How many days ago the customer last ordered. Fewer days scores higher.',
    own: 'Set my own numbers of days',
    ask: 'within how many days',
    before: 'within',
    after: 'days',
  },
  f: {
    name: 'Frequency',
    what: 'How many separate orders the customer placed.',
    own: 'Set my own numbers of orders',
    ask: 'more than how many orders',
    before: 'more than',
    after: 'orders',
  },
  m: {
    name: 'Monetary',
    what: 'How much the customer spent in total.',
    own: 'Set my own amounts',
    ask: 'more than what amount',
    before: 'more than',
    after: '',
  },
};

// Which threshold each score's row edits: recency reads "within N days" for scores 5 to 2,
// the others "more than N" for scores 5 to 2. Score 1 takes whatever is left.
const thresholdIndex = (d: Dimension, score: number) => (d === 'r' ? 5 - score : score - 2);

type Props = {
  dimension: Dimension;
  choice: ThresholdChoice;
  onChange(choice: ThresholdChoice): void;
  /** The app's quintiles for this analysis, when there is one. */
  quintiles?: Breakpoints;
  /** Customers per score 1–5 under the choice, when there is an analysis. */
  counts?: BinSizes;
};

const field =
  'h-9 w-24 rounded-control border border-control-border bg-surface px-2 text-right font-mono text-number text-text-primary disabled:border-dashed disabled:bg-canvas disabled:text-text-secondary aria-[invalid=true]:border-negative';

export function ThresholdCard({ dimension: d, choice, onChange, quintiles, counts }: Props) {
  const { name, what, own, ask, before, after } = copy[d];
  const isOwn = choice.method === 'fixed';
  const problems = isOwn ? thresholdProblems(d, choice.breaks) : [];
  const shown = isOwn ? choice.breaks : quintiles ? prefillFrom(d, quintiles) : undefined;
  const numbers = isOwn ? parseThresholds(d, choice.breaks) : quintiles;
  const ranges = numbers && problems.length === 0 ? scoreRanges(d, numbers) : undefined;
  const choose = (method: ThresholdChoice['method']) => {
    // Switching to own thresholds starts from what the app decided, when it is known.
    const empty = choice.breaks.every((b) => b.trim() === '');
    const breaks =
      method === 'fixed' && empty && quintiles ? prefillFrom(d, quintiles) : choice.breaks;
    onChange({ method, breaks });
  };
  const setBreak = (i: number, value: string) =>
    onChange({ ...choice, breaks: choice.breaks.map((b, j) => (j === i ? value.trim() : b)) });

  return (
    <fieldset className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-6">
      <legend className="float-left font-semibold">{name}</legend>
      <p className="clear-left text-small text-text-secondary">{what}</p>
      <div role="radiogroup" aria-label={`${name}: who decides`} className="flex flex-col gap-2">
        {(['quantile', 'fixed'] as const).map((method) => (
          <label key={method} className="flex items-center gap-2">
            <input
              type="radio"
              name={`threshold-${d}`}
              className="accent-action-primary"
              checked={choice.method === method}
              onChange={() => choose(method)}
            />
            {method === 'quantile'
              ? 'Let the app decide: five equal-sized groups of your customers'
              : own}
          </label>
        ))}
      </div>
      {!shown && (
        <p className="text-small text-text-secondary">
          The app works these out from your customers when the analysis runs.
        </p>
      )}
      {shown && (
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">{name} thresholds</caption>
          <thead className="text-small text-text-secondary">
            <tr className="border-b border-border">
              <th scope="col" className="py-2 pr-2 font-normal">
                Score
              </th>
              <th scope="col" className="py-2 pr-2 font-normal">
                Customer needs
              </th>
              {counts && (
                <th scope="col" className="py-2 text-right font-normal">
                  Customers
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {[5, 4, 3, 2, 1].map((score) => {
              const i = thresholdIndex(d, score);
              const range = ranges?.find((r) => r.score === score)?.range;
              return (
                <tr key={score} className="border-b border-border">
                  <th scope="row" className="py-2 pr-2 font-mono text-number font-normal">
                    {d.toUpperCase()}
                    {score}
                  </th>
                  <td className="py-2 pr-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {score > 1 && (
                        <label className="flex items-center gap-2">
                          {before}
                          <input
                            className={field}
                            inputMode={d === 'm' ? 'decimal' : 'numeric'}
                            aria-label={`${name} score ${score}: ${ask}`}
                            aria-invalid={problems.length > 0}
                            disabled={!isOwn}
                            value={shown[i] ?? ''}
                            onChange={(event) => setBreak(i, event.target.value)}
                          />
                          {after}
                        </label>
                      )}
                      {range && <span className="text-small text-text-secondary">({range})</span>}
                    </div>
                  </td>
                  {counts && (
                    <td className="py-2 text-right font-mono text-number" data-score-count={score}>
                      {(counts[score - 1] ?? 0).toLocaleString('en-US')}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {problems.map((problem) => (
        <p key={problem} role="alert" className="text-small text-negative">
          {problem}
        </p>
      ))}
    </fieldset>
  );
}
