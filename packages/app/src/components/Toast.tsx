// A short confirmation at the bottom of the screen (APP_FLOW "Friction and closure"). Dark in
// both themes like the tooltip; no shadow, since DESIGN.md keeps shadows for menus, tooltips
// and dialogs.
import { X } from 'lucide-react';
import { useEffect } from 'react';

const showForMs = 5000;

export function Toast({ message, onClose }: { message: string; onClose(): void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, showForMs);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-x-4 bottom-4 z-10 flex justify-center">
      <div
        role="status"
        className="flex items-center gap-3 rounded-control border border-border bg-tooltip px-4 py-3 text-on-tooltip"
      >
        <span>{message}</span>
        <button
          type="button"
          aria-label="Close message"
          onClick={onClose}
          className="rounded-control p-1 text-on-tooltip enabled:hover:brightness-75"
        >
          <X aria-hidden size={16} />
        </button>
      </div>
    </div>
  );
}
