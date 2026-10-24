// One field on the Map columns screen: which column holds it, and sample values from the file.

export type Need = 'required' | 'customer' | 'optional';

const needText: Record<Need, string> = {
  required: 'Required',
  customer: 'Customer ID or email is required',
  optional: 'Optional',
};

type Props = {
  field: string;
  label: string;
  need: Need;
  header: string[];
  value: number | undefined;
  samples: string[];
  /** How a sample will be read, or null when it cannot be; omit to show samples as they are. */
  read?: (sample: string) => string | null;
  onChange(value: number | undefined): void;
};

const select =
  'h-10 w-full rounded-control text-body border border-border bg-surface px-3 text-text-primary enabled:hover:bg-canvas aria-[invalid=true]:border-negative';

export function MappingRow({ field, label, need, header, value, samples, read, onChange }: Props) {
  const id = `map-${field}`;
  const missing = need === 'required' && value === undefined;
  return (
    <div
      data-testid={`field-${field}`}
      className="grid gap-2 border-b border-border py-3 last:border-0 sm:grid-cols-[12rem_1fr_1fr] sm:items-start"
    >
      <div>
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        <p className="text-small text-text-secondary">{needText[need]}</p>
      </div>
      <select
        id={id}
        className={select}
        aria-invalid={missing}
        value={value === undefined ? '' : String(value)}
        onChange={(event) =>
          onChange(event.target.value === '' ? undefined : Number(event.target.value))
        }
      >
        <option value="">{need === 'required' ? 'Choose a column' : 'Not in this file'}</option>
        {header.map((name, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: columns are identified by position
          <option key={index} value={index}>
            {name.trim() || `Column ${index + 1}`}
          </option>
        ))}
      </select>
      <ul className="text-small text-text-secondary">
        {value !== undefined && samples.length === 0 && <li>No values in the first rows</li>}
        {samples.map((sample, i) => {
          const shown = read ? read(sample) : sample;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: a fixed list of sample values
            <li key={i} className={shown === null ? 'text-negative' : ''}>
              {read ? `${sample} → ${shown ?? 'cannot be read'}` : sample}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
