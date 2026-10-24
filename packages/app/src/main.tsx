import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PrototypePage } from './PrototypePage';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <PrototypePage />
  </StrictMode>,
);
