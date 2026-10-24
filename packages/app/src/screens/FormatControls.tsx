import type { TextEncodingName } from '@rfm-matrix/io';

const separators = [
  [',', 'Comma'],
  [';', 'Semicolon'],
  ['\t', 'Tab'],
  ['|', 'Vertical bar'],
] as const;

const encodings: [TextEncodingName, string][] = [
  ['utf-8', 'UTF-8'],
  ['windows-1252', 'Windows-1252 (Western European)'],
  ['utf-16le', 'UTF-16 LE'],
  ['utf-16be', 'UTF-16 BE'],
];

type Props = {
  delimiter: string;
  encoding: TextEncodingName;
  onChange(format: { delimiter: string; encoding: TextEncodingName }): void;
};

const select =
  'h-10 rounded-control border border-border bg-surface px-3 text-text-primary enabled:hover:bg-canvas';

/** Lets the user correct a wrong guess about how the file is written (TRD §11). */
export function FormatControls({ delimiter, encoding, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-4">
      <label className="flex flex-col gap-1 text-small text-text-secondary">
        Separator
        <select
          className={select}
          value={delimiter}
          onChange={(event) => onChange({ encoding, delimiter: event.target.value })}
        >
          {separators.map(([value, label]) => (
            <option key={label} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-small text-text-secondary">
        Text encoding
        <select
          className={select}
          value={encoding}
          onChange={(event) =>
            onChange({ delimiter, encoding: event.target.value as TextEncodingName })
          }
        >
          {encodings.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
