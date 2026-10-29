// URLs that may appear in the build because they are text, never fetched. Each entry needs
// the maintainer's review. An entry ending in "/" covers that path; others match exactly.
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
    prefix: 'https://github.com/mholt/PapaParse',
    reason: 'Project link in the Papa Parse @license comment, which MIT requires us to keep',
  },
  {
    prefix: 'https://tailwindcss.com',
    reason: 'Project link in the Tailwind CSS license banner comment (MIT)',
  },
  {
    prefix: 'http://scripts.sil.org/OFL',
    reason: 'License URL inside the Geist font license text, OFL.txt (ADR-0005)',
  },
  {
    prefix: 'https://github.com/andreacasonato/rfm-matrix/issues/',
    reason: 'Feedback and Report a bug links (PRD §12); opened by the user, never fetched',
  },
  {
    prefix: 'https://react.dev/errors/',
    reason: 'Text in minified React error messages; shown, never requested',
  },
];
