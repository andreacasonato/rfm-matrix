// "Diagnostics is a panel reachable from every error, not a screen" (APP_FLOW): the facts to
// copy into a GitHub issue, with no customer data (TRD §12).
import { useState } from 'react';
import { Button } from '../components/Button';
import { bugReportUrl, ExternalLink } from '../components/ExternalLink';
import { diagnosticsText } from './diagnostics';

export function DiagnosticsPanel({ error }: { error?: string }) {
  const [copied, setCopied] = useState<'idle' | 'copied' | 'failed'>('idle');
  const text = diagnosticsText({
    userAgent: navigator.userAgent,
    ...(error === undefined ? {} : { title: error }),
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied('copied');
    } catch {
      setCopied('failed');
    }
  }

  return (
    <details className="text-small">
      <summary className="cursor-pointer text-text-secondary">Diagnostics</summary>
      <div className="mt-2 flex flex-col gap-2">
        <pre
          data-testid="diagnostics"
          className="overflow-x-auto rounded-control border border-border bg-surface p-3 font-mono whitespace-pre-wrap"
        >
          {text}
        </pre>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => void copy()}>Copy diagnostics</Button>
          <ExternalLink href={bugReportUrl}>Report a bug</ExternalLink>
          {copied !== 'idle' && (
            <span role="status">
              {copied === 'copied'
                ? 'Copied. Paste it into an issue on GitHub; it holds no customer data.'
                : 'Copying was blocked; select the text above instead.'}
            </span>
          )}
        </div>
      </div>
    </details>
  );
}
