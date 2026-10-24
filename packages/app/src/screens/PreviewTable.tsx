const maxChars = 40;

// Long values are cut at 40 characters, with the full text on hover or focus (APP_FLOW "States").
function Cell({ value }: { value: string }) {
  if (value.length <= maxChars) return <>{value}</>;
  return (
    // biome-ignore lint/a11y/noNoninteractiveTabindex: focus reveals the full value
    <span title={value} tabIndex={0}>
      {`${value.slice(0, maxChars)}…`}
    </span>
  );
}

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
                <Cell value={name} />
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
                  <Cell value={row[c] ?? ''} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
