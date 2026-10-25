// Finds references to other hosts in the built app (TRD §10, ADR-0001). The CSP is the real
// guard at runtime; this catches a stray URL before it ships. URLs assembled at runtime from
// pieces cannot be seen here.
import { readdirSync, readFileSync } from 'node:fs';
import { extname, join } from 'node:path';

export type AllowedUrl = { prefix: string; reason: string };
export type HostFinding = { file: string; url: string };

const urlPattern = new RegExp(
  [
    String.raw`\b(?:https?|wss?):\/\/[^\s"'${'`'}<>()\\]+`,
    String.raw`(?<![\w:/\\])\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:[/?#:][^\s"'${'`'}<>()\\]*)?`,
  ].join('|'),
  'gi',
);

const textExtensions = new Set([
  '.html',
  '.js',
  '.mjs',
  '.css',
  '.json',
  '.svg',
  '.webmanifest',
  '.txt',
  '.xml',
  '.map',
]);

export function externalUrls(text: string): string[] {
  return [...text.matchAll(urlPattern)].map((match) => match[0]);
}

// An entry ending in "/" allows everything below that path; any other entry is one exact URL,
// so "https://a.com" cannot be stretched to "https://a.com.evil.example".
const allows = (entry: AllowedUrl, url: string) =>
  entry.prefix.endsWith('/') ? url.startsWith(entry.prefix) : url === entry.prefix;

export function disallowedUrls(text: string, allowlist: AllowedUrl[]): string[] {
  return externalUrls(text).filter((url) => !allowlist.some((entry) => allows(entry, url)));
}

export function scanDirectory(dir: string, allowlist: AllowedUrl[]): HostFinding[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map((entry) => entry.split('\\').join('/'))
    .filter((entry) => textExtensions.has(extname(entry)))
    .sort()
    .flatMap((file) =>
      disallowedUrls(readFileSync(join(dir, file), 'utf8'), allowlist).map((url) => ({
        file,
        url,
      })),
    );
}
