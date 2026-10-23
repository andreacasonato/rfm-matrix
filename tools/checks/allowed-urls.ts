// URLs that may appear in the build because they are text, never fetched. Each entry needs
// the maintainer's review; keep prefixes as narrow as possible.
import type { AllowedUrl } from './hosts.ts';

export const allowedUrls: AllowedUrl[] = [
  { prefix: 'http://www.w3.org/2000/svg', reason: 'SVG namespace identifier used by React DOM' },
  { prefix: 'http://www.w3.org/1999/xlink', reason: 'XLink namespace identifier (React DOM)' },
  {
    prefix: 'http://www.w3.org/1998/Math/MathML',
    reason: 'MathML namespace identifier (React DOM)',
  },
  {
    prefix: 'http://www.w3.org/XML/1998/namespace',
    reason: 'XML namespace identifier (React DOM)',
  },
  {
    prefix: 'https://react.dev/errors/',
    reason: 'Text in minified React error messages; shown, never requested',
  },
];
