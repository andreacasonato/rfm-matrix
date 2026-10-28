// The projects on this device for the Start screen, read again each time it is shown.
import { useEffect, useState } from 'react';
import { listProjects, type ProjectSummary } from './projects';

export function useSavedProjects(active: boolean): ProjectSummary[] {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  useEffect(() => {
    if (!active) return;
    let current = true;
    listProjects().then(
      (list) => current && setProjects(list),
      // A database that cannot be read shows no list; the Start screen still works.
      () => current && setProjects([]),
    );
    return () => {
      current = false;
    };
  }, [active]);
  return projects;
}
