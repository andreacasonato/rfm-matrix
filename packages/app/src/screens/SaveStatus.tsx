// Whether this analysis was kept on this device (S8, TRD §11 "storage full").
import type { SaveResult } from '../analysis/protocol';
import { Notice } from '../components/Notice';

export function SaveStatus({ state }: { state: SaveResult | 'saving' }) {
  if (state === 'saving') {
    return (
      <p role="status" className="text-small text-text-secondary">
        Saving on this device…
      </p>
    );
  }
  if (state.ok) {
    return (
      <p role="status" className="text-small text-text-secondary">
        Saved on this device.
      </p>
    );
  }
  return (
    <Notice tone="warning" title="This analysis was not saved on this device">
      <p>
        {state.storageFull
          ? "The browser's storage is full. Delete projects you no longer need, then run the analysis again."
          : state.message}{' '}
        You can still use and export it while this tab is open.
      </p>
    </Notice>
  );
}
