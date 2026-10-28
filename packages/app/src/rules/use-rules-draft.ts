// The rules being edited (S7): a draft map with its undo history. Every change is sent to the
// worker at once, so the counts beside the editor always match the draft.
import type { SegmentMap, SegmentsSummary } from '@rfm-matrix/core';
import { useCallback, useRef, useState } from 'react';
import type { AnalysisSession } from '../analysis/analysis-client';

export type Change = { message: string; key: number };

export function useRulesDraft(
  saved: SegmentMap,
  initialSegments: SegmentsSummary,
  session: Pick<AnalysisSession, 'applyMap'>,
) {
  const [draft, setDraft] = useState(saved);
  const [history, setHistory] = useState<SegmentMap[]>([]);
  const [change, setChange] = useState<Change | null>(null);
  const [segments, setSegments] = useState(initialSegments);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  // Stable, so the undo bar's timer restarts only for a new change.
  const dismissChange = useCallback(() => setChange(null), []);

  // Only the newest reply counts, so quick edits never show an older map's counts.
  function preview(map: SegmentMap) {
    const ticket = ++latest.current;
    return session.applyMap(map).then(
      (next) => {
        if (ticket !== latest.current) return;
        setSegments(next);
        setError(null);
      },
      (reason: unknown) => {
        if (ticket === latest.current) setError(String((reason as Error)?.message ?? reason));
      },
    );
  }

  function apply(map: SegmentMap, message: string) {
    setHistory((past) => [...past, draft]);
    setDraft(map);
    setChange({ message, key: latest.current + 1 });
    return preview(map);
  }

  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((past) => past.slice(0, -1));
    setDraft(previous);
    setChange(null);
    return preview(previous);
  }

  return {
    draft,
    segments,
    error,
    change,
    dirty: draft !== saved,
    apply,
    undo,
    dismissChange,
    /** Puts the saved rules back in the worker, for Discard changes. */
    restore: () => preview(saved),
  };
}
