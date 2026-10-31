import type { ReactNode } from 'react';
import { Button } from './Button';
import { ExternalLink, feedbackUrl } from './ExternalLink';

type Props = { children: ReactNode; wide?: boolean; onGuide?(): void };

/** App frame: name bar with Guide and Feedback, and a centred column for the current screen; `wide` for the grid. */
export function Page({ children, wide = false, onGuide }: Props) {
  const width = wide ? 'max-w-6xl' : 'max-w-4xl';
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className={`mx-auto flex ${width} items-center justify-between gap-4 px-4 py-3`}>
          <span className="font-semibold">RFM Matrix</span>
          <div className="flex items-center gap-4">
            {onGuide && (
              <Button variant="quiet" className="h-auto text-small" onClick={onGuide}>
                Guide
              </Button>
            )}
            <ExternalLink href={feedbackUrl}>Feedback</ExternalLink>
          </div>
        </div>
      </header>
      <main className={`mx-auto flex ${width} flex-col gap-6 px-4 py-8`}>{children}</main>
    </div>
  );
}
