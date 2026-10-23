import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BenchmarkPage } from './BenchmarkPage';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <BenchmarkPage />
  </StrictMode>,
);
