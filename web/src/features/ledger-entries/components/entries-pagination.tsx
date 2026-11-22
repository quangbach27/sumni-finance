import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

import { ENTRIES_PAGE_SIZE_OPTIONS } from '../api/list-ledger-entries';

import type { ReactNode } from 'react';

type Props = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (
    pageSize: (typeof ENTRIES_PAGE_SIZE_OPTIONS)[number],
  ) => void;
};

type PageItem = number | 'ellipsis';

/** Pages to show: first, last and the current page ±1, gaps as ellipsis. */
const pageItems = (current: number, last: number): PageItem[] => {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);

  const pages = new Set([1, last, current - 1, current, current + 1]);
  // Near an edge, keep four pages so the row width stays steady.
  if (current <= 3) [2, 3, 4].forEach((n) => pages.add(n));
  if (current >= last - 2)
    [last - 3, last - 2, last - 1].forEach((n) => pages.add(n));

  const sorted = [...pages]
    .filter((n) => n >= 1 && n <= last)
    .sort((a, b) => a - b);
  return sorted.flatMap((n, i): PageItem[] =>
    i > 0 && n - sorted[i - 1] > 1 ? ['ellipsis', n] : [n],
  );
};

const Strong = ({ children }: { children: ReactNode }) => (
  <span className="text-foreground font-medium">{children}</span>
);

/** Footer of an entries table: range, rows per page and page links. */
export default function EntriesPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
}: Props) {
  if (totalCount === 0) return null;

  const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
      <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span>
          Hiển thị{' '}
          <Strong>
            {from}–{to}
          </Strong>{' '}
          trong <Strong>{totalCount}</Strong> bút toán
        </span>
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>Số dòng</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                if (v)
                  onPageSizeChange(
                    Number(v) as (typeof ENTRIES_PAGE_SIZE_OPTIONS)[number],
                  );
              }}
            >
              <SelectTrigger className="w-20">{pageSize}</SelectTrigger>
              <SelectContent>
                {ENTRIES_PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              text="Trước"
              aria-disabled={page <= 1}
              className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
              onClick={(e) => {
                e.preventDefault();
                onPageChange(page - 1);
              }}
            />
          </PaginationItem>
          {pageItems(page, lastPage).map((item, i) =>
            item === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item}>
                <PaginationLink
                  href="#"
                  isActive={item === page}
                  className={
                    item === page
                      ? 'border-primary bg-primary/10 text-primary'
                      : undefined
                  }
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(item);
                  }}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ),
          )}
          <PaginationItem>
            <PaginationNext
              href="#"
              text="Sau"
              aria-disabled={page >= lastPage}
              className={
                page >= lastPage ? 'pointer-events-none opacity-50' : ''
              }
              onClick={(e) => {
                e.preventDefault();
                onPageChange(page + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
