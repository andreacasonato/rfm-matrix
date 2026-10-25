// How dates and amounts are read, and how an order's amount is taken (ADR-0012).
import {
  type AmountLevel,
  type DateOrder,
  type DecimalSeparator,
  parseDate,
} from '@rfm-matrix/core';
import { formatDay } from './format';

type Props = {
  ambiguousExample: string | undefined;
  dateOrder: DateOrder | undefined;
  decimal: DecimalSeparator;
  amountLevel: AmountLevel;
  onDateOrder(order: DateOrder): void;
  onDecimal(decimal: DecimalSeparator): void;
  onAmountLevel(level: AmountLevel): void;
};

const select =
  'h-10 rounded-control text-body border border-border bg-surface px-3 text-text-primary enabled:hover:bg-canvas';
const choice = 'flex items-start gap-2';
const radio = 'mt-1 accent-action-primary';

export function ReadOptions(props: Props) {
  const { ambiguousExample, dateOrder, decimal, amountLevel } = props;
  return (
    <section className="flex flex-col gap-5 rounded-panel border border-border bg-surface p-6">
      {ambiguousExample && (
        <div
          role="radiogroup"
          aria-label={`How should ${ambiguousExample} be read?`}
          className="flex flex-col gap-2"
        >
          <p className="font-semibold">How should {ambiguousExample} be read?</p>
          <p className="text-small text-text-secondary">
            The dates in this file could be day first or month first. Choose the one your shop uses.
          </p>
          {(['dmy', 'mdy'] as const).map((order) => {
            const label = formatDay(parseDate(ambiguousExample, order));
            return (
              <label key={order} className={choice}>
                <input
                  className={radio}
                  type="radio"
                  name="date-order"
                  checked={dateOrder === order}
                  onChange={() => props.onDateOrder(order)}
                />
                {label}
              </label>
            );
          })}
        </div>
      )}
      <label className="flex flex-col gap-1 text-small text-text-secondary">
        Decimal separator
        <select
          className={select}
          value={decimal}
          onChange={(event) => props.onDecimal(event.target.value as DecimalSeparator)}
        >
          <option value=".">Point (12.50)</option>
          <option value=",">Comma (12,50)</option>
        </select>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">How are amounts written?</legend>
        <label className={choice}>
          <input
            className={radio}
            type="radio"
            name="amount-level"
            checked={amountLevel === 'order'}
            onChange={() => props.onAmountLevel('order')}
          />
          <span>
            One total per order. The total may be repeated, or blank, on the order's other product
            lines.
          </span>
        </label>
        <label className={choice}>
          <input
            className={radio}
            type="radio"
            name="amount-level"
            checked={amountLevel === 'line'}
            onChange={() => props.onAmountLevel('line')}
          />
          <span>Each row is a product line; add them up for the order.</span>
        </label>
      </fieldset>
    </section>
  );
}
