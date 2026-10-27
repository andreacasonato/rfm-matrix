// "Segment rules" (APP_FLOW): which scores belong to which segment? Edits apply at once, with
// an undo bar; Save rules keeps them and Discard changes puts the saved rules back (S7).
import {
  copyLayer,
  defaultSegmentMap,
  describeCell,
  type Score,
  type SegmentMap,
  type SegmentsSummary,
  sameForEveryM,
  setCell,
  validateMap,
} from '@rfm-matrix/core';
import { useState } from 'react';
import type { AnalysisSession } from '../analysis/analysis-client';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { SegmentPanel } from '../grid/SegmentPanel';
import { RulesFileActions } from './RulesFileActions';
import { RulesGrid } from './RulesGrid';
import { UndoBar } from './UndoBar';
import { useRulesDraft } from './use-rules-draft';

type Props = {
  saved: SegmentMap;
  segments: SegmentsSummary;
  cellCustomers: number[];
  session: Pick<AnalysisSession, 'applyMap'>;
  onSave(map: SegmentMap, segments: SegmentsSummary): void;
  onClose(): void;
};

const layers = [1, 2, 3, 4, 5] as const;
const isDefault = (map: SegmentMap) =>
  map.cells.every((id, i) => id === defaultSegmentMap.cells[i]);

export function RulesScreen({ saved, segments, cellCustomers, session, onSave, onClose }: Props) {
  const rules = useRulesDraft(saved, segments, session);
  const [everyM, setEveryM] = useState(() => sameForEveryM(saved));
  const [layer, setLayer] = useState<Score>(1);
  const nameOf = (id: string) => rules.draft.segments.find((s) => s.id === id)?.name ?? id;
  const problems = validateMap(rules.draft).problems;

  function change(r: Score, f: Score, segmentId: string) {
    const target = { r, f, m: everyM ? ('all' as const) : layer };
    void rules.apply(
      setCell(rules.draft, target, segmentId),
      `${describeCell(target)} is now ${nameOf(segmentId)}.`,
    );
  }

  function toggleEveryM() {
    if (everyM) return setEveryM(false);
    setEveryM(true);
    if (!sameForEveryM(rules.draft)) {
      void rules.apply(
        copyLayer(rules.draft, layer),
        `Every M score now uses the M${layer} rules.`,
      );
    }
  }

  function openFile(map: SegmentMap, message: string) {
    // A file whose rules differ by M must be edited one M score at a time.
    if (!sameForEveryM(map)) setEveryM(false);
    void rules.apply(map, message);
  }

  async function discard() {
    await rules.restore();
    onClose();
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-section font-semibold">Segment rules</h2>
        <Button variant="quiet" onClick={rules.dirty ? discard : onClose}>
          {rules.dirty ? 'Discard changes' : 'Back to grid'}
        </Button>
      </div>
      <section className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-6">
        <p className="text-text-secondary">
          Each square holds the customers with that recency (R) and frequency (F) score. Pick the
          segment they belong to; the counts update as you go.
        </p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            className="accent-action-primary"
            checked={everyM}
            onChange={toggleEveryM}
          />
          Same rules for every M score
        </label>
        {!everyM && (
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Monetary score to edit</legend>
            {layers.map((m) => (
              <label
                key={m}
                className="flex h-10 cursor-pointer items-center rounded-control border border-control-border px-3 has-checked:bg-canvas has-checked:font-semibold"
              >
                <input
                  type="radio"
                  name="m-layer"
                  className="sr-only"
                  checked={layer === m}
                  onChange={() => setLayer(m)}
                />
                M{m}
              </label>
            ))}
          </fieldset>
        )}
      </section>
      {rules.error && (
        <Notice tone="error" title="The grid could not be updated">
          <p>{rules.error}</p>
        </Notice>
      )}
      {problems.length > 0 && (
        <Notice tone="error" title="These rules cannot be saved">
          <ul>
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Notice>
      )}
      {/* Stacked: the 25 choices need the full width to show segment names. */}
      <div className="flex flex-col gap-6">
        <RulesGrid
          map={rules.draft}
          layer={everyM ? 'all' : layer}
          cellCustomers={cellCustomers}
          onChange={change}
        />
        <SegmentPanel summary={rules.segments} />
      </div>
      {/* Room below the actions, so the undo bar never sits on top of them. */}
      <div className="mb-16 flex flex-wrap gap-3">
        <Button
          variant="primary"
          disabled={!rules.dirty || problems.length > 0}
          onClick={() => onSave(rules.draft, rules.segments)}
        >
          Save rules
        </Button>
        <Button
          disabled={isDefault(rules.draft)}
          onClick={() => void rules.apply(defaultSegmentMap, 'Default rules restored.')}
        >
          Reset to default
        </Button>
        <RulesFileActions map={rules.draft} base={saved} onOpen={openFile} />
      </div>
      {rules.change && (
        // A new key per change restarts the bar and its 10 seconds.
        <UndoBar
          key={rules.change.key}
          change={rules.change}
          onUndo={rules.undo}
          onDismiss={rules.dismissChange}
        />
      )}
    </>
  );
}
