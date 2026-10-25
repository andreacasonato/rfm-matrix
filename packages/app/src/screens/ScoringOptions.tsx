// How each dimension is scored 1–5 (TRD §8 rules 5–7): quintiles or four fixed cut points.
import {
  type Breakpoints,
  type Dimension,
  type ScoringMethods,
  validateBreaks,
} from '@rfm-matrix/core';

export type ScoringChoices = Record<Dimension, { method: 'quantile' | 'fixed'; breaks: string[] }>;

export const defaultScoringChoices: ScoringChoices = {
  r: { method: 'quantile', breaks: ['30', '60', '90', '180'] },
  f: { method: 'fixed', breaks: ['1', '2', '3', '5'] },
  m: { method: 'quantile', breaks: ['', '', '', ''] },
};

const dimensions: { key: Dimension; name: string; hint: string }[] = [
  {
    key: 'r',
    name: 'Recency',
    hint: 'Days since the last order. Up to the first cut point scores 5.',
  },
  { key: 'f', name: 'Frequency', hint: 'Number of orders. Up to the first cut point scores 1.' },
  { key: 'm', name: 'Monetary', hint: 'Total spent. Up to the first cut point scores 1.' },
];

/** The methods, plus problems per dimension; methods is undefined while any is unusable. */
export function scoringFrom(choices: ScoringChoices) {
  const problems = {} as Record<Dimension, string[]>;
  const methods = {} as ScoringMethods;
  for (const { key } of dimensions) {
    const choice = choices[key];
    if (choice.method === 'quantile') {
      problems[key] = [];
      methods[key] = { method: 'quantile' };
      continue;
    }
    const breaks = choice.breaks.map((b) => (b.trim() === '' ? Number.NaN : Number(b)));
    problems[key] = validateBreaks(key, breaks);
    // Only used once validateBreaks has confirmed exactly four numbers.
    methods[key] = { method: 'fixed', breaks: breaks as Breakpoints };
  }
  const usable = Object.values(problems).every((p) => p.length === 0);
  return { methods: usable ? methods : undefined, problems };
}

type Props = { choices: ScoringChoices; onChange(choices: ScoringChoices): void };

const field =
  'h-10 rounded-control border border-border bg-surface px-3 text-body text-text-primary enabled:hover:bg-canvas aria-[invalid=true]:border-negative';

export function ScoringOptions({ choices, onChange }: Props) {
  const { problems } = scoringFrom(choices);
  return (
    <fieldset className="flex flex-col gap-4 rounded-panel border border-border bg-surface p-6">
      <legend className="float-left font-semibold">Scoring</legend>
      <p className="clear-left text-small text-text-secondary">
        Each customer gets 1 to 5 for recency, frequency and monetary value.
      </p>
      {dimensions.map(({ key, name, hint }) => {
        const choice = choices[key];
        const set = (patch: Partial<ScoringChoices[Dimension]>) =>
          onChange({ ...choices, [key]: { ...choice, ...patch } });
        return (
          <div key={key} className="flex flex-col gap-2">
            <label className="flex flex-col gap-1 text-small text-text-secondary">
              {name} scoring
              <select
                className={field}
                value={choice.method}
                onChange={(event) => set({ method: event.target.value as 'quantile' | 'fixed' })}
              >
                <option value="quantile">Quintiles from your data</option>
                <option value="fixed">Fixed cut points</option>
              </select>
            </label>
            {choice.method === 'fixed' && (
              <>
                <p className="text-small text-text-secondary">{hint}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {choice.breaks.map((value, i) => (
                    <input
                      // biome-ignore lint/suspicious/noArrayIndexKey: always four fixed positions
                      key={i}
                      className={field}
                      type="number"
                      step="any"
                      aria-label={`${name} cut point ${i + 1}`}
                      aria-invalid={problems[key].length > 0}
                      value={value}
                      onChange={(event) => {
                        const breaks = [...choice.breaks];
                        breaks[i] = event.target.value;
                        set({ breaks });
                      }}
                    />
                  ))}
                </div>
                {problems[key].map((problem) => (
                  <p key={problem} className="text-small text-negative">
                    {problem}
                  </p>
                ))}
              </>
            )}
          </div>
        );
      })}
    </fieldset>
  );
}
