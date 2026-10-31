// "How scores work" (APP_FLOW): the method, this analysis's cut points and how many customers
// each score holds, and what RFM cannot tell (PRD §12: scores describe the past).
import type { Breakpoints, Dimension, ScoringMethods } from '@rfm-matrix/core';
import { Button } from '../components/Button';
import { formatDay } from '../screens/format';
import { binSizesFrom, scoreRanges } from './score-ranges';

type Props = {
  scoring: ScoringMethods;
  breakpoints: Record<Dimension, Breakpoints>;
  cellCustomers: number[];
  analysisDate: string;
  onBack(): void;
};

const panel = 'flex flex-col gap-3 rounded-panel border border-border bg-surface p-6';

const dimensions: { d: Dimension; name: string; what: string }[] = [
  { d: 'r', name: 'Recency', what: 'Days from the customer’s latest order to the analysis date.' },
  { d: 'f', name: 'Frequency', what: 'Number of separate orders, after cleaning.' },
  { d: 'm', name: 'Monetary', what: 'Total spent, after cleaning.' },
];

const methodIn = (scoring: ScoringMethods, d: Dimension) =>
  scoring[d].method === 'quantile'
    ? 'Cut at the 20th, 40th, 60th and 80th percentiles of your customers (quintiles, as Excel’s PERCENTILE.INC).'
    : 'Cut at your own thresholds, set on Score thresholds or Clean and settings.';

export function HowScoresWork({
  scoring,
  breakpoints,
  cellCustomers,
  analysisDate,
  onBack,
}: Props) {
  const bins = binSizesFrom(cellCustomers);
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-section font-semibold">How scores work</h2>
        <Button variant="quiet" onClick={onBack}>
          Back to grid
        </Button>
      </div>
      <section className={panel}>
        <p>
          Every customer gets a score from 1 to 5 for recency (R), frequency (F) and monetary value
          (M), as of {formatDay(Date.parse(`${analysisDate}T00:00:00Z`))}. Higher is better: R5
          bought most recently, F5 most often, M5 spent most. The segment comes from the scores and
          your segment rules.
        </p>
        <p className="text-text-secondary">
          A score is 1 plus the number of cut points below the customer’s value. Customers with
          equal values always get the same score, so some scores can hold more customers than
          others.
        </p>
      </section>
      {dimensions.map(({ d, name, what }) => (
        <section key={d} className={panel}>
          <h3 className="font-semibold">{name}</h3>
          <p className="text-small text-text-secondary">
            {what} {methodIn(scoring, d)}
          </p>
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">{name} scores</caption>
            <thead>
              <tr className="border-b border-border text-small text-text-secondary">
                <th scope="col" className="py-2 font-normal">
                  Score
                </th>
                <th scope="col" className="py-2 font-normal">
                  Customers with
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  Customers
                </th>
              </tr>
            </thead>
            <tbody>
              {scoreRanges(d, breakpoints[d]).map(({ score, range }) => (
                <tr key={score} className="border-b border-border">
                  <td className="py-2 font-mono text-number">{score}</td>
                  <td className="py-2">{range}</td>
                  <td className="py-2 text-right font-mono text-number">
                    {(bins[d][score - 1] ?? 0).toLocaleString('en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <section className={panel}>
        <h3 className="font-semibold">What RFM cannot tell you</h3>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>It describes the past. It does not predict who will buy next.</li>
          <li>Scores compare your customers with each other, not with other shops.</li>
          <li>
            It knows nothing about margins, returns after the analysis date, or why a customer
            stopped buying.
          </li>
          <li>
            When most customers bought once, frequency tells little apart; that is why F uses fixed
            cut points by default.
          </li>
        </ul>
      </section>
    </>
  );
}
