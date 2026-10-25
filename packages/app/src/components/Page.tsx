import type { ReactNode } from 'react';

/** App frame: name bar and a centred column for the current screen; `wide` for the grid. */
export function Page({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const width = wide ? 'max-w-6xl' : 'max-w-4xl';
  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-surface">
        <div className={`mx-auto ${width} px-4 py-3 font-semibold`}>RFM Matrix</div>
      </header>
      <main className={`mx-auto flex ${width} flex-col gap-6 px-4 py-8`}>{children}</main>
    </div>
  );
}
