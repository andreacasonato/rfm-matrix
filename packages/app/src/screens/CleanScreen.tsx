// "Clean and settings" (APP_FLOW): which orders count? Counts update as choices change.
import { type CleaningRules, orderCounts, statusCounts } from '@rfm-matrix/core';
import { useEffect, useState } from 'react';
import type { AnalysisPlan, CsvFormat, FileSummary } from '../analysis/protocol';
import { startSummary } from '../analysis/worker-client';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { defaultCleaning } from '../mapping/default-cleaning';
import { type Choices, CleaningOptions } from './CleaningOptions';
import { ExclusionCounts } from './ExclusionCounts';

type Props = {
  fileName: string;
  file: Blob;
  plan: AnalysisPlan;
  format: CsvFormat;
  onBack(): void;
  onRun(plan: AnalysisPlan): void;
  summarise?: typeof startSummary;
};

type Load =
  | { status: 'reading'; rowsRead: number }
  | { status: 'ready'; summary: FileSummary }
  | { status: 'error'; message: string };

const dayMs = 86_400_000;

/** The rules from the choices, or undefined while a date or number is incomplete. */
function rulesFrom(choices: Choices): CleaningRules | undefined {
  const rules: CleaningRules = {
    excludedStatuses: [...choices.excluded],
    amountBasis: choices.basis,
    subtractRefunds: choices.subtractRefunds,
  };
  if (choices.dateMode === 'today')
    rules.analysisDate = new Date(Math.floor(Date.now() / dayMs) * dayMs);
  if (choices.dateMode === 'custom') {
    const time = Date.parse(`${choices.customDate}T00:00:00Z`);
    if (Number.isNaN(time)) return undefined;
    rules.analysisDate = new Date(time);
  }
  const days =
    choices.lookback === 'custom' ? Number(choices.customDays) : Number(choices.lookback);
  if (choices.lookback !== '') {
    if (!Number.isInteger(days) || days < 1) return undefined;
    rules.lookbackDays = days;
  }
  return rules;
}

export function CleanScreen(props: Props) {
  const { fileName, file, plan, format, onBack, onRun, summarise = startSummary } = props;
  const [load, setLoad] = useState<Load>({ status: 'reading', rowsRead: 0 });
  const [choices, setChoices] = useState<Choices | undefined>();

  useEffect(() => {
    const job = summarise(file, plan, format, ({ rowsRead }) =>
      setLoad({ status: 'reading', rowsRead }),
    );
    job.result.then(
      ({ summary }) => {
        const defaults = defaultCleaning(summary, plan);
        setChoices({
          excluded: new Set(defaults.excludedStatuses),
          basis: 'gross',
          subtractRefunds: true,
          dateMode: 'latest',
          customDate: '',
          lookback: '',
          customDays: '',
        });
        setLoad({ status: 'ready', summary });
      },
      (error: Error) => {
        if (error.name !== 'AbortError') setLoad({ status: 'error', message: error.message });
      },
    );
    return () => job.cancel();
  }, [summarise, file, plan, format]);

  const summary = load.status === 'ready' ? load.summary : undefined;
  const rules = choices && rulesFrom(choices);
  const counts = summary && rules ? orderCounts(summary.profile, rules) : undefined;

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-title font-semibold">Clean and settings</h1>
        <Button variant="quiet" onClick={onBack}>
          Back
        </Button>
      </div>
      {load.status === 'reading' && (
        <section aria-busy="true" className="rounded-panel border border-border bg-surface p-6">
          Reading the orders in {fileName}… {load.rowsRead.toLocaleString('en-US')} rows so far
        </section>
      )}
      {load.status === 'error' && (
        <Notice
          tone="error"
          title="The orders could not be read"
          actions={<Button onClick={onBack}>Back</Button>}
        >
          <p>{load.message}</p>
        </Notice>
      )}
      {summary && choices && (
        <>
          <CleaningOptions
            statuses={statusCounts(summary.profile)}
            mapping={plan.mapping}
            refundRows={summary.profile.refunds}
            latestDay={summary.profile.latestDay}
            choices={choices}
            onChange={setChoices}
          />
          {counts && (
            <ExclusionCounts counts={counts} unreadableRows={summary.rowsRead - summary.rowsUsed} />
          )}
          <div>
            <Button
              variant="primary"
              disabled={!rules || !counts || counts.used === 0}
              onClick={() => rules && onRun({ ...plan, cleaning: rules })}
            >
              Run analysis
            </Button>
          </div>
        </>
      )}
    </>
  );
}
