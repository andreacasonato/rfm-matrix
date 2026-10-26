// Usage: node tools/checks/check-csp.ts <build directory>
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { contentSecurityPolicy } from '../../packages/app/csp.ts';
import { cspProblems } from './csp.ts';

const page = join(process.argv[2] ?? '', 'index.html');
if (!existsSync(page)) {
  console.error(`Built page not found: ${page}. Run pnpm build first.`);
  process.exit(1);
}

const problems = cspProblems(readFileSync(page, 'utf8'), contentSecurityPolicy);
if (problems.length > 0) {
  for (const problem of problems) console.error(`${page}: ${problem}`);
  process.exit(1);
}
console.log(`${page} carries the approved Content-Security-Policy.`);
