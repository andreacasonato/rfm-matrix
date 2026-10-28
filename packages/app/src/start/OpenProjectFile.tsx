// Open project file (S9): a project saved on this or another computer, checked in a worker and
// added as a new project. What is wrong with a file is shown only as plain text.
import { useRef, useState } from 'react';
import { startProjectImport } from '../analysis/worker-client';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import type { OpenedProjectFile } from '../storage/project-files';

type Props = {
  onOpened(projectId: string): void;
  importFile?: (file: Blob) => Promise<OpenedProjectFile>;
};

const importInWorker = (file: Blob) => startProjectImport(file).result.then((m) => m.result);

type State =
  | { status: 'idle' | 'opening' }
  | { status: 'refused'; name: string; problems: string[] };

export function OpenProjectFile({ onOpened, importFile = importInWorker }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<State>({ status: 'idle' });

  async function open(file: File) {
    setState({ status: 'opening' });
    try {
      const result = await importFile(file);
      if (!result.ok)
        return setState({ status: 'refused', name: file.name, problems: result.problems });
      setState({ status: 'idle' });
      onOpened(result.projectId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setState({ status: 'refused', name: file.name, problems: [message] });
    }
  }

  return (
    <>
      <Button
        loading={state.status === 'opening'}
        loadingLabel="Opening…"
        onClick={() => input.current?.click()}
      >
        Open project file
      </Button>
      <input
        ref={input}
        type="file"
        accept=".rfmproject"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void open(file);
        }}
      />
      {state.status === 'refused' && (
        <div className="basis-full">
          <Notice tone="error" title={`${state.name} cannot be opened`}>
            <ul className="list-disc pl-5">
              {state.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </Notice>
        </div>
      )}
    </>
  );
}
