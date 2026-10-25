// The choices on the cleaning screen (ADR-0013): statuses, amounts, analysis date and window.
import type { ColumnMapping } from '@rfm-matrix/core';
import { formatDay } from './format';
import { plural } from './plural';

export type DateMode = 'latest' | 'today' | 'custom';
export type Choices = {
  excluded: Set<string>;
  basis: 'gross' | 'net';
  subtractRefunds: boolean;
  dateMode: DateMode;
  customDate: string;
  lookback: string;
  customDays: string;
};

type Props = {
  statuses: { status: string; orders: number }[];
  mapping: ColumnMapping;
  refundRows: number;
  latestDay: number | undefined;
  choices: Choices;
  onChange(choices: Choices): void;
};

const panel = 'flex flex-col gap-3 rounded-panel border border-border bg-surface p-6';
const field =
  'h-10 rounded-control border border-border bg-surface px-3 text-body text-text-primary enabled:hover:bg-canvas';
const choice = 'flex items-start gap-2';
const tick = 'mt-1 accent-action-primary';
const hint = 'text-small text-text-secondary';
const dayMs = 86_400_000;

export function CleaningOptions({
  statuses,
  mapping,
  refundRows,
  latestDay,
  choices,
  onChange,
}: Props) {
  const set = (patch: Partial<Choices>) => onChange({ ...choices, ...patch });
  const canNet = mapping.tax !== undefined || mapping.shipping !== undefined;
  const latest = latestDay === undefined ? 'no dated orders' : formatDay((latestDay + 1) * dayMs);
  return (
    <>
      <fieldset className={panel}>
        <legend className="float-left mb-1 font-semibold">Order statuses to include</legend>
        {mapping.status === undefined ? (
          <p className={`clear-left ${hint}`}>
            No status column was chosen, so every order counts.
          </p>
        ) : (
          statuses.map(({ status, orders }) => (
            <label key={status} className={`clear-left ${choice}`}>
              <input
                className={tick}
                type="checkbox"
                checked={!choices.excluded.has(status)}
                onChange={(event) => {
                  const excluded = new Set(choices.excluded);
                  if (event.target.checked) excluded.delete(status);
                  else excluded.add(status);
                  set({ excluded });
                }}
              />
              {status || 'No status'} · {plural(orders, 'order')}
            </label>
          ))
        )}
      </fieldset>

      <fieldset className={panel}>
        <legend className="float-left mb-1 font-semibold">Amounts</legend>
        <label className={`clear-left ${choice}`}>
          <input
            className={tick}
            type="radio"
            name="basis"
            checked={choices.basis === 'gross'}
            onChange={() => set({ basis: 'gross' })}
          />
          Gross: the order total as exported
        </label>
        <label className={choice}>
          <input
            className={tick}
            type="radio"
            name="basis"
            disabled={!canNet}
            checked={choices.basis === 'net'}
            onChange={() => set({ basis: 'net' })}
          />
          Net: the total minus tax and shipping
        </label>
        {!canNet && (
          <p className={hint}>
            To use net amounts, map a Tax or Shipping column on the previous screen.
          </p>
        )}
        <label className={choice}>
          <input
            className={tick}
            type="checkbox"
            checked={choices.subtractRefunds}
            onChange={(event) => set({ subtractRefunds: event.target.checked })}
          />
          Subtract refunds
        </label>
        <p className={hint}>
          {mapping.refunded !== undefined
            ? 'Uses the Refunded amount column and any refund rows.'
            : refundRows > 0
              ? `${plural(refundRows, 'refund row')} found in this file.`
              : 'This file has no refund amounts or refund rows to subtract.'}
        </p>
      </fieldset>

      <fieldset className={panel}>
        <legend className="float-left mb-1 font-semibold">Analysis date</legend>
        <p className={`clear-left ${hint}`}>Recency is counted back from this day.</p>
        <label className={choice}>
          <input
            className={tick}
            type="radio"
            name="date"
            checked={choices.dateMode === 'latest'}
            onChange={() => set({ dateMode: 'latest' })}
          />
          Day after the latest order ({latest})
        </label>
        <label className={choice}>
          <input
            className={tick}
            type="radio"
            name="date"
            checked={choices.dateMode === 'today'}
            onChange={() => set({ dateMode: 'today' })}
          />
          Today ({formatDay(Math.floor(Date.now() / dayMs) * dayMs)})
        </label>
        <label className={choice}>
          <input
            className={tick}
            type="radio"
            name="date"
            checked={choices.dateMode === 'custom'}
            onChange={() => set({ dateMode: 'custom' })}
          />
          Another date
        </label>
        {choices.dateMode === 'custom' && (
          <label className={`flex flex-col gap-1 ${hint}`}>
            Analysis date
            <input
              className={field}
              type="date"
              value={choices.customDate}
              onChange={(event) => set({ customDate: event.target.value })}
            />
          </label>
        )}
        <label className={`flex flex-col gap-1 ${hint}`}>
          Orders to include
          <select
            className={field}
            value={choices.lookback}
            onChange={(event) => set({ lookback: event.target.value })}
          >
            <option value="">All orders</option>
            <option value="365">Last 12 months</option>
            <option value="730">Last 24 months</option>
            <option value="custom">A number of days</option>
          </select>
        </label>
        {choices.lookback === 'custom' && (
          <label className={`flex flex-col gap-1 ${hint}`}>
            Days before the analysis date
            <input
              className={field}
              type="number"
              min={1}
              value={choices.customDays}
              onChange={(event) => set({ customDays: event.target.value })}
            />
          </label>
        )}
      </fieldset>
    </>
  );
}
