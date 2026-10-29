import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { allowedUrls } from './allowed-urls.ts';
import { disallowedUrls, externalUrls, scanDirectory } from './hosts.ts';

const allow = [{ prefix: 'http://www.w3.org/2000/svg', reason: 'SVG namespace' }];

describe('externalUrls', () => {
  it('finds absolute and protocol-relative URLs in JS, HTML and CSS', () => {
    const text = [
      'fetch("https://api.example.com/v1")',
      '<script src="//cdn.example.net/x.js"></script>',
      'background:url(//img.example.org/a.png)',
      'new WebSocket(`wss://live.example.io`)',
    ].join('\n');
    expect(externalUrls(text)).toEqual([
      'https://api.example.com/v1',
      '//cdn.example.net/x.js',
      '//img.example.org/a.png',
      'wss://live.example.io',
    ]);
  });

  it('ignores comments, regex literals and source-map hints', () => {
    const text = '// see notes.md\n/a\\/\\/b/.test(x)\n//# sourceMappingURL=index.js.map';
    expect(externalUrls(text)).toEqual([]);
  });
});

describe('disallowedUrls', () => {
  it('keeps URLs that match no allowlist prefix', () => {
    const text = 'createElementNS("http://www.w3.org/2000/svg") fetch("https://x.example")';
    expect(disallowedUrls(text, allow)).toEqual(['https://x.example']);
  });

  it('does not let an allowed host hide a different path', () => {
    expect(disallowedUrls('"http://www.w3.org/evil.js"', allow)).toEqual([
      'http://www.w3.org/evil.js',
    ]);
  });
});

describe('allowlist matching', () => {
  const list = [
    { prefix: 'https://tailwindcss.com', reason: 'exact' },
    { prefix: 'https://react.dev/errors/', reason: 'folder' },
  ];

  it('treats an entry without a trailing slash as one exact URL', () => {
    const text = '"https://tailwindcss.com" "https://tailwindcss.com.evil.example/x.js"';
    expect(disallowedUrls(text, list)).toEqual(['https://tailwindcss.com.evil.example/x.js']);
  });

  it('treats an entry ending in a slash as everything below that path', () => {
    const text = '"https://react.dev/errors/418" "https://react.dev/other"';
    expect(disallowedUrls(text, list)).toEqual(['https://react.dev/other']);
  });
});

describe('the app allowlist', () => {
  it('allows links to the project issues, and nothing else on GitHub', () => {
    const text = [
      '"https://github.com/andreacasonato/rfm-matrix/issues/new/choose"',
      '"https://github.com/andreacasonato/rfm-matrix/issues/new?template=bug_report.md"',
      '"https://github.com/andreacasonato/rfm-matrix/raw/main/x.js"',
      '"https://github.com/other/"',
    ].join(' ');
    expect(disallowedUrls(text, allowedUrls)).toEqual([
      'https://github.com/andreacasonato/rfm-matrix/raw/main/x.js',
      'https://github.com/other/',
    ]);
  });
});

describe('scanDirectory', () => {
  let dir = '';
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('reports every text file with a disallowed URL, including nested ones', () => {
    dir = mkdtempSync(join(tmpdir(), 'hosts-'));
    mkdirSync(join(dir, 'assets'));
    writeFileSync(join(dir, 'index.html'), '<link href="https://fonts.example.com/a.css">');
    writeFileSync(join(dir, 'assets', 'app.js'), 'x("http://www.w3.org/2000/svg")');
    writeFileSync(join(dir, 'assets', 'style.css'), '@import url(//cdn.example.net/b.css);');
    expect(scanDirectory(dir, allow)).toEqual([
      { file: 'assets/style.css', url: '//cdn.example.net/b.css' },
      { file: 'index.html', url: 'https://fonts.example.com/a.css' },
    ]);
  });
});
