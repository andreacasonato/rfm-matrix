// The customers in one segment, a page at a time, sortable by any column (APP_FLOW).
import { Button } from '../components/Button';
import { Truncated } from '../components/Truncated';
import type { SegmentPage, Sort, SortKey } from './customer-table';

export const pageSize = 50;

type Props = {
  segmentName: string;
  page: SegmentPage;
  pageIndex: number;
  sort: Sort;
  hasEmail: boolean;
  onSort(key: SortKey): void;
  onPage(index: number): void;
};

const columns: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: 'customer', label: 'Customer', numeric: false },
  { key: 'email', label: 'Email', numeric: false },
  { key: 'recencyDays', label: 'Recency (days)', numeric: true },
  { key: 'orders', label: 'Orders', numeric: true },
  { key: 'spend', label: 'Spend', numeric: true },
  { key: 'r', label: 'R', numeric: true },
  { key: 'f', label: 'F', numeric: true },
  { key: 'm', label: 'M', numeric: true },
];

const count = (n: number) => n.toLocaleString('en-US');
const money = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function CustomerList({
  segmentName,
  page,
  pageIndex,
  sort,
  hasEmail,
  onSort,
  onPage,
}: Props) {
  const shown = columns.filter((c) => hasEmail || c.key !== 'email');
  const first = pageIndex * pageSize + 1;
  const last = Math.min(page.total, (pageIndex + 1) * pageSize);
  return (
    <section className="flex flex-col gap-3 rounded-panel border border-border bg-surface p-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="sr-only">Customers in {segmentName}</caption>
          <thead>
            <tr className="border-b border-border text-small text-text-secondary">
              {shown.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={
                    sort.key === c.key
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  className={`px-2 py-2 font-normal ${c.numeric ? 'text-right' : ''}`}
                >
                  <button
                    type="button"
                    aria-label={`Sort by ${c.label}`}
                    onClick={() => onSort(c.key)}
                    className="rounded-control enabled:hover:text-text-primary"
                  >
                    {c.label}
                    {sort.key === c.key && (sort.direction === 'asc' ? ' ↑' : ' ↓')}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {page.rows.map((row, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: customer keys may repeat across pages; rows are a snapshot
              <tr key={`${pageIndex}-${i}`} className="border-b border-border last:border-0">
                <td className="px-2 py-2">
                  <Truncated value={row.customer} />
                </td>
                {hasEmail && (
                  <td className="px-2 py-2 text-text-secondary">
                    <Truncated value={row.email ?? ''} />
                  </td>
                )}
                <td className="px-2 py-2 text-right font-mono text-number">
                  {count(row.recencyDays)}
                </td>
                <td className="px-2 py-2 text-right font-mono text-number">{count(row.orders)}</td>
                <td className="px-2 py-2 text-right font-mono text-number">{money(row.spend)}</td>
                <td className="px-2 py-2 text-right font-mono text-number">{row.r}</td>
                <td className="px-2 py-2 text-right font-mono text-number">{row.f}</td>
                <td className="px-2 py-2 text-right font-mono text-number">{row.m}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-small text-text-secondary">
        <p>
          Showing {count(first)}–{count(last)} of {count(page.total)}
        </p>
        <div className="flex gap-2">
          <Button disabled={pageIndex === 0} onClick={() => onPage(pageIndex - 1)}>
            Previous page
          </Button>
          <Button disabled={last >= page.total} onClick={() => onPage(pageIndex + 1)}>
            Next page
          </Button>
        </div>
      </div>
    </section>
  );
}
