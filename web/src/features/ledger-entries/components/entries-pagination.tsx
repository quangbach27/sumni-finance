import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

type Props = {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (page: number) => void;
};

/** Page numbers around the current page, e.g. 1 2 3. */
const pageNumbers = (current: number, last: number) => {
  const start = Math.max(1, Math.min(current - 1, last - 2));
  const end = Math.min(last, start + 2);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
};

/** Footer of an entries table: "Hiển thị a–b / n" plus page links. */
export default function EntriesPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
}: Props) {
  const lastPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const from = totalCount ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
      <span className="text-muted-foreground text-sm">
        Hiển thị {from}–{to} / {totalCount} bút toán
      </span>
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
          {pageNumbers(page, lastPage).map((n) => (
            <PaginationItem key={n}>
              <PaginationLink
                href="#"
                isActive={n === page}
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange(n);
                }}
              >
                {n}
              </PaginationLink>
            </PaginationItem>
          ))}
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
