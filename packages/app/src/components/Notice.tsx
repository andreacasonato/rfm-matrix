import type { ReactNode } from 'react';
import { DiagnosticsPanel } from '../diagnostics/DiagnosticsPanel';

type Tone = 'error' | 'warning' | 'info';

const tones: Record<Tone, { box: string; title: string }> = {
  error: { box: 'border-negative bg-negative-tint', title: 'text-negative' },
  warning: { box: 'border-warning bg-warning-tint', title: 'text-warning' },
  info: { box: 'border-border bg-surface', title: 'text-text-primary' },
};

type Props = { tone: Tone; title: string; children?: ReactNode; actions?: ReactNode };

/** A status message with a coloured bar; errors are announced at once, others politely, and
 * every error offers the diagnostics panel. */
export function Notice({ tone, title, children, actions }: Props) {
  const style = tones[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex flex-col gap-2 rounded-control border-l-4 px-4 py-3 ${style.box}`}
    >
      <p className={`font-semibold ${style.title}`}>{title}</p>
      {children && <div className="text-text-primary">{children}</div>}
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      {tone === 'error' && <DiagnosticsPanel error={title} />}
    </div>
  );
}
