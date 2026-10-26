import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/index.css';
import { installTrustedTypes, type PolicyFactory } from './trusted-types';

installTrustedTypes((window as { trustedTypes?: PolicyFactory }).trustedTypes, document.baseURI);

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
