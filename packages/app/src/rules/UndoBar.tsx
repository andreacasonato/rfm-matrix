// "Undo bar for 10 seconds after each change" (APP_FLOW "Friction and closure").
import { useEffect } from 'react';
import { Button } from '../components/Button';
import type { Change } from './use-rules-draft';

const showForMs = 10_000;

type Props = { change: Change; onUndo(): void; onDismiss(): void };

export function UndoBar({ change, onUndo, onDismiss }: Props) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, showForMs);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    // The wrapper spans the width but lets clicks through; only the bar itself takes them.
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-10 flex justify-center">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-3 rounded-control border border-text-secondary bg-tooltip py-1 pr-1 pl-4 text-on-tooltip"
      >
        <span>{change.message}</span>
        <Button variant="quiet" className="text-on-tooltip" onClick={onUndo}>
          Undo
        </Button>
      </div>
    </div>
  );
}
