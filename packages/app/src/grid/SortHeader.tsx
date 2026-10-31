// A column header in the segment list that sorts the rows when clicked. aria-sort is set only on
// the sorted column, as the ARIA table pattern asks; the arrow shows the same thing visually.
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SegmentSort } from './segment-sort';

type Props = {
  column: SegmentSort['key'];
  sort: SegmentSort;
  onSort(column: SegmentSort['key']): void;
  align?: 'left' | 'right';
  className?: string;
  children: ReactNode;
};

export function SortHeader({
  column,
  sort,
  onSort,
  align = 'left',
  className = '',
  children,
}: Props) {
  const active = sort.key === column;
  const direction = active && sort.key !== 'segment' ? sort.direction : undefined;
  const Icon = direction === 'ascending' ? ArrowUp : direction ? ArrowDown : ArrowUpDown;
  return (
    <th
      scope="col"
      aria-sort={direction}
      className={`px-0.5 py-2 font-normal sm:px-2 ${align === 'right' ? 'text-right' : ''} ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        // The arrow wraps under the label when the column is tight, so a narrow phone never
        // scrolls the table sideways.
        className={`inline-flex flex-wrap items-center gap-x-1 rounded-control hover:text-text-primary hover:underline underline-offset-4 ${
          align === 'right' ? 'justify-end' : ''
        } ${direction ? 'font-semibold text-text-primary' : ''}`}
      >
        {children}
        <Icon aria-hidden="true" size={14} />
      </button>
    </th>
  );
}
