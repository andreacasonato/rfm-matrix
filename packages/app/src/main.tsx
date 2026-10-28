import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/index.css';
import { recordError } from './diagnostics/diagnostics';
import { registerOffline } from './offline/register';
import { installTrustedTypes, type PolicyFactory } from './trusted-types';

// Anything uncaught goes to the diagnostics panel (TRD §12), scrubbed of customer data.
window.addEventListener('error', (event) => recordError(event.message));
window.addEventListener('unhandledrejection', (event) =>
  recordError(event.reason instanceof Error ? event.reason.message : String(event.reason)),
);

installTrustedTypes((window as { trustedTypes?: PolicyFactory }).trustedTypes, document.baseURI);

// The dev server has no sw.js; the build does (ADR-0020).
if (import.meta.env.PROD) registerOffline(navigator.serviceWorker);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
