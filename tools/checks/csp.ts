// Checks that the built page carries the approved Content-Security-Policy (ADR-0015) where a
// browser applies it: one meta tag in <head>, ahead of every script, stylesheet and style.
const metaPattern = /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"\s*\/?>/gi;
const resourcePattern = /<(?:script|link|style)\b/i;
const entities: Record<string, string> = {
  '&#39;': "'",
  '&#x27;': "'",
  '&quot;': '"',
  '&amp;': '&',
};
const decode = (text: string) =>
  text.replace(/&#39;|&#x27;|&quot;|&amp;/g, (e) => entities[e] ?? e);

export function cspProblems(html: string, approved: string): string[] {
  const head = /<head>([\s\S]*?)<\/head>/i.exec(html)?.[1] ?? '';
  const metas = [...head.matchAll(metaPattern)];
  const first = metas[0];
  if (!first) return ['No Content-Security-Policy meta tag in <head>.'];
  if (metas.length > 1) return ['There is more than one Content-Security-Policy meta tag.'];
  const problems: string[] = [];
  if (decode(first[1] ?? '') !== approved) {
    problems.push('The Content-Security-Policy differs from the approved one (ADR-0015).');
  }
  if (resourcePattern.test(head.slice(0, first.index))) {
    problems.push(
      'The Content-Security-Policy must come before every script, stylesheet and style.',
    );
  }
  return problems;
}
