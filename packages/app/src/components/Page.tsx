import type { ReactNode } from 'react';

/** App frame: name bar and a centred column for the current screen. */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-3 font-semibold">RFM Matrix</div>
      </header>
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">{children}</main>
    </div>
  );
}
