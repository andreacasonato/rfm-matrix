// Usage: node tools/checks/check-release-ref.ts
// Run in the deploy workflow after a checkout with full history, so origin/main is known.
// GitHub sets GITHUB_REF_TYPE and GITHUB_REF_NAME to the ref the workflow was started from.
import { spawnSync } from 'node:child_process';
import { releaseRefProblems } from './release-ref.ts';

const refType = process.env.GITHUB_REF_TYPE ?? '';
const refName = process.env.GITHUB_REF_NAME ?? '';
// Exit code 0 means HEAD is main or one of its ancestors; anything else, including a missing
// origin/main, counts as not on main.
const onMain =
  spawnSync('git', ['merge-base', '--is-ancestor', 'HEAD', 'origin/main'], { stdio: 'inherit' })
    .status === 0;

const problems = releaseRefProblems({ refType, refName, onMain });
if (problems.length > 0) {
  for (const problem of problems) console.error(problem);
  process.exit(1);
}
console.log(`Deploying ${refName}: a release tag on main.`);
