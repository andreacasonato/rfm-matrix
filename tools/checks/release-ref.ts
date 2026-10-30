// Decides whether a deploy may run from the ref it was started on (TRD §13, ADR-0009): only a
// release tag like v1.2.3 whose commit is on main. Rollback picks an older tag, which passes too.

export type DeployRef = { refType: string; refName: string; onMain: boolean };

const releaseTag = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export function releaseRefProblems({ refType, refName, onMain }: DeployRef): string[] {
  if (refType !== 'tag') {
    return [
      `Deploys run only from a release tag, not the ${refType || 'ref'} "${refName}" (ADR-0009).`,
    ];
  }
  const problems: string[] = [];
  if (!releaseTag.test(refName)) {
    problems.push(`The tag "${refName}" is not a release version like v1.2.3 (ADR-0009).`);
  }
  if (!onMain) {
    problems.push(`The tag "${refName}" points at a commit that is not on main (ADR-0009).`);
  }
  return problems;
}
