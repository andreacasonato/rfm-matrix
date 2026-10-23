// Module specifiers in a TypeScript or JavaScript source, found by pattern rather than a
// parser. Computed specifiers (import(variable)) cannot be seen; review those by hand.

const patterns = [
  /\bimport\s+(?:type\s+)?(?:[\w$*{}\s,]+?\s+from\s+)?['"]([^'"]+)['"]/g,
  /\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];

export function importSpecifiers(source: string): string[] {
  const found: { index: number; specifier: string }[] = [];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      found.push({ index: match.index, specifier: match[1] ?? '' });
    }
  }
  return found.sort((a, b) => a.index - b.index).map((f) => f.specifier);
}
