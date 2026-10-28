// "Three questions on first upload, each pre-filling later steps" (APP_FLOW "Onboarding", S11):
// where the file came from, how amounts are written, and the analysis date. Each starts from
// what the file shows, and Map columns and Clean and settings can still change every answer.
import { type AmountLevel, detectPreset, type PresetId, presets } from '@rfm-matrix/core';
import type { CsvPreview } from '@rfm-matrix/io';
import { type ReactNode, useState } from 'react';
import { Button } from '../components/Button';
import type { DateMode } from '../screens/CleaningOptions';
import { formatDay } from '../screens/format';

/** The answers, passed on to Map columns and Clean and settings. */
export type Onboarding = {
  preset: PresetId;
  amountLevel: AmountLevel;
  dateMode: DateMode;
  customDate: string;
};

type Props = {
  fileName: string;
  preview: CsvPreview;
  onDone(answers: Onboarding): void;
  onSkip(): void;
};

const dayMs = 86_400_000;
const panel = 'flex flex-col gap-3 rounded-panel border border-border bg-surface p-6';
const choice = 'flex items-start gap-2';
const radio = 'mt-1 accent-action-primary';

function Question({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className={panel}>
      <legend className="float-left font-semibold">{legend}</legend>
      <div className="clear-left flex flex-col gap-2">{children}</div>
    </fieldset>
  );
}

export function OnboardingScreen({ fileName, preview, onDone, onSkip }: Props) {
  const [detected] = useState(() => detectPreset(preview.header));
  const [answers, setAnswers] = useState<Onboarding>({
    preset: detected,
    amountLevel: 'order',
    dateMode: 'latest',
    customDate: '',
  });
  const set = (change: Partial<Onboarding>) => setAnswers((a) => ({ ...a, ...change }));
  const ready = answers.dateMode !== 'custom' || answers.customDate !== '';
  const option = (name: string, checked: boolean, onChange: () => void, text: ReactNode) => (
    <label className={choice}>
      <input className={radio} type="radio" name={name} checked={checked} onChange={onChange} />
      <span>{text}</span>
    </label>
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-title font-semibold">Three quick questions</h1>
        <Button variant="quiet" onClick={onSkip}>
          Skip questions
        </Button>
      </div>
      <p className="text-text-secondary">
        About {fileName}. Your answers fill in the next steps, where you can still change them.
      </p>
      <Question legend="Where is this file from?">
        {presets.map((p) =>
          option(
            'platform',
            answers.preset === p.id,
            () => set({ preset: p.id }),
            <>
              {p.name}
              {p.id === detected && p.id !== 'other' && (
                <span className="text-text-secondary"> (matches this file's columns)</span>
              )}
            </>,
          ),
        )}
      </Question>
      <Question legend="How are amounts written?">
        {option(
          'amounts',
          answers.amountLevel === 'order',
          () => set({ amountLevel: 'order' }),
          "One total per order. The total may be repeated, or blank, on the order's other product lines.",
        )}
        {option(
          'amounts',
          answers.amountLevel === 'line',
          () => set({ amountLevel: 'line' }),
          'Each row is a product line; add them up for the order.',
        )}
      </Question>
      <Question legend="Score customers as of which day?">
        {option(
          'date',
          answers.dateMode === 'latest',
          () => set({ dateMode: 'latest' }),
          'Day after the latest order in the file (recommended)',
        )}
        {option(
          'date',
          answers.dateMode === 'today',
          () => set({ dateMode: 'today' }),
          `Today (${formatDay(Math.floor(Date.now() / dayMs) * dayMs)})`,
        )}
        {option(
          'date',
          answers.dateMode === 'custom',
          () => set({ dateMode: 'custom' }),
          'Another date',
        )}
        {answers.dateMode === 'custom' && (
          <label className="flex flex-col gap-1 text-small text-text-secondary">
            Analysis date
            <input
              type="date"
              value={answers.customDate}
              onChange={(event) => set({ customDate: event.target.value })}
              className="h-10 rounded-control border border-control-border bg-surface px-3 text-body text-text-primary"
            />
          </label>
        )}
      </Question>
      <div>
        <Button variant="primary" disabled={!ready} onClick={() => onDone(answers)}>
          Continue
        </Button>
      </div>
    </>
  );
}
