// "Delete all data: dialog stating exactly what is deleted; user types DELETE to confirm"
// (APP_FLOW "Friction and closure").
import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { plural } from '../screens/plural';
import type { deleteAllData } from '../storage/delete-all';

type Props = {
  projects: number;
  snapshots: number;
  deleteAll: typeof deleteAllData;
  onCancel(): void;
  onDeleted(): void;
};

export function DeleteAllDialog({ projects, snapshots, deleteAll, onCancel, onDeleted }: Props) {
  const [typed, setTyped] = useState('');
  const [state, setState] = useState<'idle' | 'deleting' | 'blocked' | 'failed'>('idle');
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => field.current?.focus(), []);

  async function confirm() {
    setState('deleting');
    try {
      await deleteAll({ onBlocked: () => setState('blocked') });
      onDeleted();
    } catch {
      setState('failed');
    }
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-text-primary/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-all-title"
        className="flex w-full max-w-md flex-col gap-4 rounded-panel border border-border bg-surface p-6 shadow-lg"
        onKeyDown={(event) => event.key === 'Escape' && state !== 'deleting' && onCancel()}
      >
        <h2 id="delete-all-title" className="text-section font-semibold">
          Delete all data?
        </h2>
        <p>
          This deletes everything RFM Matrix keeps in this browser: {plural(projects, 'project')}{' '}
          and {plural(snapshots, 'saved analysis', 'saved analyses')}, with their customer scores
          and any emails, and your segment rules. Your order files and exported CSVs are not
          touched. This cannot be undone.
        </p>
        <label className="flex flex-col gap-1 text-small text-text-secondary">
          Type DELETE to confirm
          <input
            ref={field}
            value={typed}
            autoComplete="off"
            onChange={(event) => setTyped(event.target.value)}
            className="h-10 rounded-control border border-control-border bg-surface px-3 text-body text-text-primary"
          />
        </label>
        {state === 'blocked' && (
          <p role="status" className="text-small text-warning">
            Close other RFM Matrix tabs in this browser to finish deleting.
          </p>
        )}
        {state === 'failed' && (
          <p role="alert" className="text-small text-negative">
            The data could not be deleted. Close other RFM Matrix tabs and try again.
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-3">
          <Button onClick={onCancel} disabled={state === 'deleting'}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={typed !== 'DELETE'}
            loading={state === 'deleting'}
            loadingLabel="Deleting…"
            onClick={() => void confirm()}
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
