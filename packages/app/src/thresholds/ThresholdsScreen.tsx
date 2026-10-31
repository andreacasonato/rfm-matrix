// Score thresholds (U5): what a customer needs to score 1 to 5 on each dimension, set after an
// analysis with live counts from the worker. Applying scores everyone again and, for a saved
// analysis, updates it in place (ADR-0019 notes).
import type {
  BinSizes,
  Breakpoints,
  Dimension,
  ScoringMethods,
  SegmentMap,
} from '@rfm-matrix/core';
import { useEffect, useState } from 'react';
import type { AnalysisSession, ScoringApplied } from '../analysis/analysis-client';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { type ScoringChoices, scoringFrom } from './choices';
import { ThresholdCard } from './ThresholdCard';

type Props = {
  scoring: ScoringMethods;
  breakpoints: Record<Dimension, Breakpoints>;
  map: SegmentMap;
  session: AnalysisSession;
  /** True while the analysis is first being saved; applying waits for it. */
  saving: boolean;
  onApplied(applied: ScoringApplied): void;
  onClose(): void;
};

const dimensions: Dimension[] = ['r', 'f', 'm'];

// Own thresholds as typed; dimensions left to the app start empty, so choosing "Set my own"
// fills them from this analysis's quintiles.
const choicesFrom = (scoring: ScoringMethods) =>
  Object.fromEntries(
    dimensions.map((d) => {
      const m = scoring[d];
      return [
        d,
        m.method === 'fixed'
          ? { method: 'fixed', breaks: m.breaks.map(String) }
          : { method: 'quantile', breaks: ['', '', '', ''] },
      ];
    }),
  ) as ScoringChoices;

export function ThresholdsScreen(props: Props) {
  const { scoring, breakpoints, map, session, saving, onApplied, onClose } = props;
  const [choices, setChoices] = useState(() => choicesFrom(scoring));
  const [counts, setCounts] = useState<Partial<Record<Dimension, BinSizes>>>({});
  const [quintiles, setQuintiles] = useState<Partial<Record<Dimension, Breakpoints>>>(() =>
    Object.fromEntries(
      dimensions.filter((d) => scoring[d].method === 'quantile').map((d) => [d, breakpoints[d]]),
    ),
  );
  const [applying, setApplying] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const { methods } = scoringFrom(choices);
  const changed = methods !== undefined && JSON.stringify(methods) !== JSON.stringify(scoring);

  // Ask the worker for counts a moment after typing stops; the latest answer wins.
  // Keyed by the methods as text, since scoringFrom builds a new object every render.
  const key = JSON.stringify(methods ?? null);
  useEffect(() => {
    const asked = JSON.parse(key) as ScoringMethods | null;
    if (!asked) return;
    let current = true;
    const timer = setTimeout(() => {
      for (const d of dimensions) {
        session.scoreCounts(d, asked[d]).then(
          (answer) => {
            if (!current) return;
            setCounts((c) => ({ ...c, [d]: answer.counts }));
            if (asked[d].method === 'quantile')
              setQuintiles((q) => ({ ...q, [d]: answer.breakpoints }));
          },
          () => {},
        );
      }
    }, 200);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [key, session]);

  async function apply() {
    if (!methods) return;
    setApplying(true);
    setFailed(null);
    try {
      onApplied(await session.applyScoring(methods, map));
    } catch (error) {
      setFailed(error instanceof Error ? error.message : String(error));
      setApplying(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-section font-semibold">Score thresholds</h2>
        <Button variant="quiet" onClick={onClose}>
          Back to grid
        </Button>
      </div>
      <p className="text-text-secondary">
        What a customer needs to score 1 to 5. The counts show how many of your customers each score
        would hold. Which scores make each segment is set in Edit segment rules.
      </p>
      {dimensions.map((d) => (
        <ThresholdCard
          key={d}
          dimension={d}
          choice={choices[d]}
          onChange={(choice) => setChoices((c) => ({ ...c, [d]: choice }))}
          {...(quintiles[d] ? { quintiles: quintiles[d] } : {})}
          {...(methods && counts[d] ? { counts: counts[d] } : {})}
        />
      ))}
      {saving && (
        <p role="status" className="text-small text-text-secondary">
          This analysis is still being saved on this device. You can apply thresholds in a moment.
        </p>
      )}
      {failed && (
        <Notice tone="error" title="The thresholds could not be applied">
          <p>{failed}</p>
        </Notice>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          variant="primary"
          disabled={!changed || saving}
          loading={applying}
          loadingLabel="Applying…"
          onClick={() => void apply()}
        >
          Apply thresholds
        </Button>
      </div>
    </>
  );
}
