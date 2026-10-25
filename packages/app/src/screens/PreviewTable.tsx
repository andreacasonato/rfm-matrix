import { Truncated } from '../components/Truncated';

export function PreviewTable({ header, rows }: { header: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-panel border border-border bg-surface">
      <table className="w-full border-collapse text-left">
        <caption className="sr-only">First {rows.length} rows of the file</caption>
        <thead>
          <tr className="border-b border-border">
            {header.map((name, i) => (
              <th
                // biome-ignore lint/suspicious/noArrayIndexKey: column names may repeat; order is fixed
                key={`${i}-${name}`}
                scope="col"
                className="whitespace-nowrap px-3 py-2 font-semibold"
              >
                <Truncated value={name} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are a fixed snapshot of the file
            <tr key={r} className="border-b border-border last:border-0">
              {header.map((_, c) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: columns follow the header order
                <td key={c} className="whitespace-nowrap px-3 py-2 text-text-secondary">
                  <Truncated value={row[c] ?? ''} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
