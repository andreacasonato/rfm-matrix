// DESIGN.md: UI code uses theme tokens only. Raw colour values may appear in the tokens file
// alone, and Tailwind's default palette classes are never used.

export type ColourViolation = { file: string; line: number; match: string };

const tokensFile = 'packages/app/src/styles/tokens.css';
const isTestFile = (path: string) => /\.test\.[jt]sx?$/.test(path);

const palette =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const utilities =
  'bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|divide|shadow|accent|caret|placeholder';

const patterns = [
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g,
  /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/g,
  new RegExp(`(?<![\\w-])(?:${utilities})-(?:(?:${palette})-\\d{2,3}|white|black)\\b`, 'g'),
];

export function colourViolations(files: { path: string; source: string }[]): ColourViolation[] {
  const violations: ColourViolation[] = [];
  for (const { path, source } of files) {
    if (path === tokensFile || isTestFile(path)) continue;
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        const line = source.slice(0, match.index).split('\n').length;
        violations.push({ file: path, line, match: match[0] });
      }
    }
  }
  return violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}
