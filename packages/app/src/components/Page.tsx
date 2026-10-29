import type { ReactNode } from 'react';
import { ExternalLink, feedbackUrl } from './ExternalLink';

/** App frame: name bar with Feedback, and a centred column for the current screen; `wide` for the grid. */
export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const width = wide ? 'max-w-6xl' : 'max-w-4xl';
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className={`mx-auto flex ${width} items-center justify-between gap-4 px-4 py-3`}>
          <span className="font-semibold">RFM Matrix</span>
          <ExternalLink href={feedbackUrl}>Feedback</ExternalLink>
        </div>
      </header>
      <main className={`mx-auto flex ${width} flex-col gap-6 px-4 py-8`}>{children}</main>
    </div>
  );
}
