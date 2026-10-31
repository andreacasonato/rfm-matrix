// Score thresholds on Clean and settings, before an analysis (TRD §8 rules 5–7, U5). The same
// cards appear on Score thresholds after an analysis, with customer counts.
import type { Dimension } from '@rfm-matrix/core';
import type { ScoringChoices } from '../thresholds/choices';
import { ThresholdCard } from '../thresholds/ThresholdCard';

type Props = { choices: ScoringChoices; onChange(choices: ScoringChoices): void };

export function ScoringOptions({ choices, onChange }: Props) {
  return (
    <section aria-labelledby="score-thresholds" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 id="score-thresholds" className="font-semibold">
          Score thresholds
        </h3>
        <p className="text-small text-text-secondary">
          What a customer needs to score 1 to 5 for recency, frequency and monetary value. You can
          change these after the analysis too.
        </p>
      </div>
      {(['r', 'f', 'm'] as Dimension[]).map((d) => (
        <ThresholdCard
          key={d}
          dimension={d}
          choice={choices[d]}
          onChange={(choice) => onChange({ ...choices, [d]: choice })}
        />
      ))}
    </section>
  );
}
