// "What your file needs" (U6): the shape of an order export the app can read, shown under the
// drop zone and in the Guide from one source. The example values are checked against the
// parser in tests, so this text cannot promise a form the app refuses.
import type { DecimalSeparator } from '@rfm-matrix/core';
import { useId } from 'react';

export const exampleHeader = ['Order ID', 'Email', 'Order date', 'Amount'];
export const exampleRows = [
  ['1001', 'ana@example.test', '2026-04-03', '42.50'],
  ['1002', 'ben@example.test', '2026-04-05', '19.90'],
  ['1003', 'ana@example.test', '2026-05-12', '38.00'],
];
export const exampleDates = ['2026-04-03', '03/04/2026', '04/03/2026 2:15 PM'];
export const exampleAmounts: [string, DecimalSeparator][] = [
  ['42.50', '.'],
  ['42,50', ','],
  ['€42.50', '.'],
];

const list = 'flex list-disc flex-col gap-1 pl-5';

function Values({ values }: { values: string[] }) {
  return values.map((value, i) => (
    <span key={value}>
      {i > 0 && (i === values.length - 1 ? ' or ' : ', ')}
      <span className="whitespace-nowrap text-text-primary">{value}</span>
    </span>
  ));
}

export function FileRequirements() {
  const requiredId = useId();
  return (
    <div className="flex flex-col gap-3">
      <p>
        A CSV file with one row per order, or one row per product line with the order ID repeated on
        each line. The first row holds the column names.
      </p>
      <p id={requiredId} className="font-semibold">
        Required columns
      </p>
      <ul aria-labelledby={requiredId} className={list}>
        <li>Customer ID or email</li>
        <li>Order ID</li>
        <li>Order date</li>
        <li>Amount</li>
      </ul>
      <p className="text-text-secondary">
        Optional: status (to leave out cancelled orders), refunded amount, tax and shipping. The
        names do not have to match: you choose the right column on the next step. Other columns are
        ignored, and names and addresses are never stored.
      </p>
      <ul className={`${list} text-text-secondary`}>
        <li>
          Dates like <Values values={exampleDates} />. The app works out whether the day or the
          month comes first, and asks when it cannot tell.
        </li>
        <li>
          Amounts like <Values values={exampleAmounts.map(([text]) => text)} />, with a decimal
          point or comma and an optional currency symbol.
        </li>
        <li>
          Up to 320 MB. From Excel, save it as CSV first. The separator and text encoding can be
          changed after upload.
        </li>
      </ul>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-small">
          <caption className="sr-only">Example of an order export</caption>
          <thead className="text-text-secondary">
            <tr className="border-b border-border">
              {exampleHeader.map((name) => (
                <th key={name} scope="col" className="whitespace-nowrap py-2 pr-3 font-normal">
                  {name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {exampleRows.map((row) => (
              <tr key={row[0]} className="border-b border-border last:border-0">
                {row.map((cell, c) => (
                  <td
                    key={cell}
                    className={`whitespace-nowrap py-2 pr-3 ${c >= 2 ? 'font-mono text-number tabular-nums' : ''}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
