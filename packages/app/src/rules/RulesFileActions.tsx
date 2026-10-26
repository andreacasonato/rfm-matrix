// Export rules and Open rules file (S7). A file is checked by core before it is used; what is
// wrong with it is shown only as plain text (PRD §6).
import {
  refuseLargeMapFile,
  type SegmentMap,
  segmentMapFromFile,
  segmentMapToFile,
} from '@rfm-matrix/core';
import { useRef, useState } from 'react';
import { Button } from '../components/Button';
import { downloadFile } from '../components/download';
import { Notice } from '../components/Notice';

type Props = {
  map: SegmentMap;
  /** The app's own segments, which every opened file is read against. */
  base: SegmentMap;
  onOpen(map: SegmentMap, message: string): void;
  download?: typeof downloadFile;
};

type Refusal = { name: string; problems: string[] };

export function RulesFileActions({ map, base, onOpen, download = downloadFile }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [refusal, setRefusal] = useState<Refusal | null>(null);

  async function open(file: File) {
    // Checked before reading, so a huge file is never loaded into memory.
    const result = refuseLargeMapFile(file.size) ?? segmentMapFromFile(await file.text(), base);
    if (!result.ok) return setRefusal({ name: file.name, problems: result.problems });
    setRefusal(null);
    onOpen(result.map, `Rules opened from ${file.name}.`);
  }

  return (
    <>
      <Button
        onClick={() =>
          download(
            new Blob([segmentMapToFile(map)], { type: 'application/json' }),
            'segment-rules.json',
          )
        }
      >
        Export rules
      </Button>
      <Button onClick={() => input.current?.click()}>Open rules file</Button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) void open(file);
        }}
      />
      {refusal && (
        <div className="basis-full">
          <Notice tone="error" title={`${refusal.name} cannot be used`}>
            <ul className="list-disc pl-5">
              {refusal.problems.map((problem) => (
                <li key={problem}>{problem}</li>
              ))}
            </ul>
          </Notice>
        </div>
      )}
    </>
  );
}
