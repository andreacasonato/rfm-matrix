// Usage: node tools/checks/check-hosts.ts <build directory>
import { existsSync } from 'node:fs';
import { allowedUrls } from './allowed-urls.ts';
import { scanDirectory } from './hosts.ts';

const dir = process.argv[2];
if (!dir || !existsSync(dir)) {
  console.error(`Build directory not found: ${dir ?? '(none given)'}. Run pnpm build first.`);
  process.exit(1);
}

const findings = scanDirectory(dir, allowedUrls);
if (findings.length > 0) {
  console.error('External hosts found in the build (ADR-0001 forbids them):');
  for (const { file, url } of findings) console.error(`  ${file}: ${url}`);
  process.exit(1);
}
console.log(`No external hosts in ${dir}.`);
