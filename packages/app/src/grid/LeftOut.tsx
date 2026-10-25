import type { DoneMessage } from '../analysis/protocol';

const count = (n: number) => n.toLocaleString('en-US');

// Why some orders and customers are not in the results (ADR-0013).
export function LeftOut({ counts }: { counts: DoneMessage['cleaning'] }) {
  const parts = [
    [counts.status, 'by status'],
    [counts.afterAnalysisDate, 'after the analysis date'],
    [counts.beforeWindow, 'before the window'],
    [counts.withoutDate, 'without a date'],
  ]
    .filter(([n]) => Number(n) > 0)
    .map(([n, why]) => `${count(Number(n))} ${why}`);
  if (parts.length === 0 && counts.customersWithoutOrders === 0) return null;
  return (
    <p>
      {parts.length > 0 && `Orders left out: ${parts.join(', ')}. `}
      {counts.refundsApplied > 0 && `${count(counts.refundsApplied)} refunds subtracted. `}
      {counts.customersWithoutOrders > 0 &&
        `${count(counts.customersWithoutOrders)} customers had no order left to score.`}
    </p>
  );
}
