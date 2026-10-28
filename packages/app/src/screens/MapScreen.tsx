// "Map columns" (APP_FLOW): which column is which? Guessed from a preset, changeable, checked.
import {
  type AmountLevel,
  type ColumnMapping,
  type DateOrder,
  detectDateOrder,
  detectDecimal,
  type Field,
  fieldLabels,
  guessMapping,
  type PresetId,
  parseAmount,
  parseDate,
  presets,
  validateMapping,
} from '@rfm-matrix/core';
import type { CsvPreview } from '@rfm-matrix/io';
import { useState } from 'react';
import type { AnalysisPlan } from '../analysis/protocol';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { initialPlan } from '../mapping/initial-plan';
import { columnNamesOf, mappingFromPrevious } from '../mapping/previous-settings';
import type { Onboarding } from '../onboarding/OnboardingScreen';
import type { StoredMapping } from '../storage/schema';
import { formatAmount, formatDay } from './format';
import { MappingRow, type Need } from './MappingRow';
import { ReadOptions } from './ReadOptions';

type Props = {
  fileName: string;
  preview: CsvPreview;
  onBack(): void;
  onConfirm(plan: AnalysisPlan): void;
  /** A saved project's last mapping, for its next export (journey 4). */
  previous?: StoredMapping;
  /** The first-upload answers (S11). */
  answers?: Pick<Onboarding, 'preset' | 'amountLevel'>;
};

const fields: [Field, Need][] = [
  ['customerId', 'customer'],
  ['email', 'customer'],
  ['orderId', 'required'],
  ['orderedAt', 'required'],
  ['amount', 'required'],
  ['status', 'optional'],
  ['refunded', 'optional'],
  ['tax', 'optional'],
  ['shipping', 'optional'],
];

const select =
  'h-10 rounded-control text-body border border-control-border bg-surface px-3 text-text-primary enabled:hover:bg-canvas';

function samplesOf(preview: CsvPreview, index: number | undefined): string[] {
  if (index === undefined) return [];
  const values = preview.rows.map((row) => row[index]?.trim() ?? '').filter(Boolean);
  return [...new Set(values)].slice(0, 3);
}

export function MapScreen({ fileName, preview, onBack, onConfirm, previous, answers }: Props) {
  const [initial] = useState(() => initialPlan(preview, answers?.preset));
  const [matched] = useState(() => previous && mappingFromPrevious(preview.header, previous));
  const [preset, setPreset] = useState<PresetId>(initial.preset);
  const [mapping, setMapping] = useState<ColumnMapping>(matched?.mapping ?? initial.plan.mapping);
  const [chosenDecimal, setChosenDecimal] = useState(previous?.read.decimal);
  const [chosenOrder, setChosenOrder] = useState(previous?.read.dateOrder);
  const [amountLevel, setAmountLevel] = useState<AmountLevel>(
    previous?.amountLevel ?? answers?.amountLevel ?? 'order',
  );

  const dateSamples = samplesOf(preview, mapping.orderedAt);
  const detected = detectDateOrder(dateSamples);
  const ambiguous = detected === 'ambiguous';
  const dateOrder: DateOrder | undefined =
    chosenOrder ?? (detected === 'mdy' ? 'mdy' : ambiguous ? undefined : 'dmy');
  // Detected from the amount column in use, until the user picks one.
  const decimal = chosenDecimal ?? detectDecimal(samplesOf(preview, mapping.amount));
  const problems = validateMapping(mapping, preview.header);
  const ready = problems.length === 0 && dateOrder !== undefined;

  const readers: Partial<Record<Field, (sample: string) => string | null>> = {
    orderedAt: (sample) => {
      if (!dateOrder) return 'choose the date order below';
      const time = parseDate(sample, dateOrder);
      return Number.isNaN(time) ? null : formatDay(time);
    },
  };
  const readAmount = (sample: string) => {
    const value = parseAmount(sample, decimal);
    return value === null || Number.isNaN(value) ? null : formatAmount(value);
  };
  for (const field of ['amount', 'refunded', 'tax', 'shipping'] as const)
    readers[field] = readAmount;
  const presetInfo = presets.find((p) => p.id === preset);

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-title font-semibold">Map columns</h1>
        <Button variant="quiet" onClick={onBack}>
          Back
        </Button>
      </div>
      {matched && (
        <Notice tone="info" title="Columns matched by name from your last analysis">
          {matched.missing.length > 0 && (
            <p>Not in this file: {matched.missing.map((f) => fieldLabels[f]).join(', ')}.</p>
          )}
        </Notice>
      )}
      <section className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-6">
        <label className="flex flex-col gap-1 text-small text-text-secondary">
          Where is this file from?
          <select
            className={select}
            value={preset}
            onChange={(event) => {
              const id = event.target.value as PresetId;
              setPreset(id);
              setMapping(guessMapping(preview.header, id));
              setChosenOrder(undefined);
            }}
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        {preset === 'woocommerce' && presetInfo && !presetInfo.verified && (
          <p className="text-small text-text-secondary">
            WooCommerce exports differ by plugin. Column names are guessed from common export
            plugins, so check the columns below.
          </p>
        )}
        <p className="text-text-secondary">
          Columns in {fileName}. Each field shows a few values from the file and how they will be
          read.
        </p>
        <div>
          {fields.map(([field, need]) => (
            <MappingRow
              key={field}
              field={field}
              label={fieldLabels[field]}
              need={need}
              header={preview.header}
              value={mapping[field]}
              samples={samplesOf(preview, mapping[field])}
              {...(readers[field] ? { read: readers[field] } : {})}
              onChange={(value) => {
                const next = { ...mapping };
                if (value === undefined) delete next[field];
                else next[field] = value;
                setMapping(next);
                if (field === 'orderedAt') setChosenOrder(undefined);
              }}
            />
          ))}
        </div>
      </section>
      <ReadOptions
        ambiguousExample={ambiguous ? dateSamples[0] : undefined}
        dateOrder={dateOrder}
        decimal={decimal}
        amountLevel={amountLevel}
        onDateOrder={setChosenOrder}
        onDecimal={setChosenDecimal}
        onAmountLevel={setAmountLevel}
      />
      {problems.length > 0 && (
        <Notice tone="error" title="Some columns still need choosing">
          <ul className="list-disc pl-5">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </Notice>
      )}
      <div>
        <Button
          variant="primary"
          disabled={!ready}
          onClick={() => {
            if (!dateOrder) return;
            const columnNames = columnNamesOf(mapping, preview.header);
            onConfirm({ mapping, columnNames, read: { decimal, dateOrder }, amountLevel });
          }}
        >
          Confirm columns
        </Button>
      </div>
    </>
  );
}
