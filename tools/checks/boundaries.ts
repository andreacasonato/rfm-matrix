// Import rules between packages, from ADR-0002 and AGENTS.md.
import { posix } from 'node:path';
import { importSpecifiers } from './imports.ts';

export type SourceFile = { path: string; source: string };
export type Violation = { file: string; specifier: string; reason: string };

// Modules that would give core I/O, UI or storage, even from a test file.
const forbiddenInCore = ['@rfm-matrix/io', '@rfm-matrix/app', 'react', 'react-dom', 'idb'];
const forbiddenInIo = ['@rfm-matrix/app'];

const isTestFile = (path: string) => /\.test\.[jt]sx?$/.test(path);
const isRelative = (specifier: string) => specifier.startsWith('.');
const matchesModule = (specifier: string, name: string) =>
  specifier === name || specifier.startsWith(`${name}/`);

function violationFor(pkg: string, file: SourceFile, specifier: string): string | undefined {
  if (isRelative(specifier)) {
    const target = posix.normalize(posix.join(posix.dirname(file.path), specifier));
    if (!target.startsWith(`packages/${pkg}/`)) {
      return `relative import leaves packages/${pkg}; import the package by name`;
    }
    return undefined;
  }
  if (pkg === 'core') {
    if (forbiddenInCore.some((name) => matchesModule(specifier, name))) {
      return 'core must not import io, app, React or browser storage';
    }
    if (!isTestFile(file.path)) {
      return 'core source imports nothing outside itself; it is pure rules';
    }
  }
  if (pkg === 'io' && forbiddenInIo.some((name) => matchesModule(specifier, name))) {
    return 'io must not import app';
  }
  return undefined;
}

export function checkBoundaries(files: SourceFile[]): Violation[] {
  const violations: Violation[] = [];
  for (const file of files) {
    const pkg = file.path.split('/')[1] ?? '';
    for (const specifier of importSpecifiers(file.source)) {
      const reason = violationFor(pkg, file, specifier);
      if (reason) violations.push({ file: file.path, specifier, reason });
    }
  }
  return violations;
}
