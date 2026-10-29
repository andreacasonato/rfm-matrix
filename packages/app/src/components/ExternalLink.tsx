import type { ReactNode } from 'react';

// The only way feedback reaches the project, since the app sends nothing (PRD §12). Opening a
// link is the user leaving the app, not a request from it, so the CSP is unchanged; the URLs
// are allowed in tools/checks/allowed-urls.ts. Written out in full so pnpm check:hosts sees them.
export const feedbackUrl = 'https://github.com/andreacasonato/rfm-matrix/issues/new/choose';
export const bugReportUrl =
  'https://github.com/andreacasonato/rfm-matrix/issues/new?template=bug_report.md';

/** A link that opens in a new tab, so an analysis in progress is never lost. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-small font-semibold text-action-text underline-offset-4 hover:underline active:brightness-90"
    >
      {children} <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}
