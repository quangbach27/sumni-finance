import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, MoreHorizontal } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { formatAmount } from '@/lib/currency';
import { formatDate } from '@/lib/date';

import { getLedgerEntryQueryOptions } from '../../api/get-ledger-entry';
import { listLedgerEntriesQueryOptions } from '../../api/list-ledger-entries';
import EntryDetailDialog from './entry-detail/entry-detail-dialog';
import FundSourceEntriesFilterBar from './fund-source-entries-filter-bar';
import { useEntriesParams } from './use-entries-params';
import { useEntriesSearch } from './use-entries-search';

import type { LedgerEntriesOrderBy } from '../../api/list-ledger-entries';
import type { LedgerEntry } from '../../api/types';

const dash = <span className="text-muted-foreground">—</span>;

function SortableHead({
  column,
  children,
}: {
  column: LedgerEntriesOrderBy;
  children: string;
}) {
  const { search, update } = useEntriesSearch();
  const active = search.orderBy === column;
  const Icon = !active
    ? ArrowUpDown
    : search.order === 'asc'
      ? ArrowUp
      : ArrowDown;

  return (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2"
        onClick={() =>
          update({
            orderBy: column,
            order: active && search.order === 'desc' ? 'asc' : 'desc',
          })
        }
      >
        {children}
        <Icon data-icon="inline-end" />
      </Button>
    </TableHead>
  );
}

/** Page numbers around the current page, e.g. 1 2 3. */
function pageNumbers(current: number, last: number) {
  const start = Math.max(1, Math.min(current - 1, last - 2));
  const end = Math.min(last, start + 2);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

export default function FundSourceEntriesTable({
  fundSourceUuid,
}: {
  fundSourceUuid: string;
}) {
  const params = useEntriesParams(fundSourceUuid);
  const { search, update } = useEntriesSearch();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(listLedgerEntriesQueryOptions(params));

  const totalCount = data?.page_info.total_count;
  const pageSize = data?.page_info.page_size ?? 10;
  const page = params.page ?? 1;
  const lastPage = Math.max(1, Math.ceil((totalCount ?? 0) / pageSize));
  const from = totalCount ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, totalCount ?? 0);

  // Seed the details query with the row so the dialog opens instantly.
  const openEntry = (entry: LedgerEntry) => {
    queryClient.setQueryData(
      getLedgerEntryQueryOptions(entry.uuid).queryKey,
      entry,
    );
    update({ entry: entry.uuid, page });
  };

  return (
    <>
      <FundSourceEntriesFilterBar totalCount={totalCount} />

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <SortableHead column="occurred_at">Ngày</SortableHead>
              <SortableHead column="category_uuid">Danh mục</SortableHead>
              <TableHead>Thẻ</TableHead>
              <TableHead className="text-right">Nợ</TableHead>
              <TableHead className="text-right">Có</TableHead>
              <TableHead className="text-right">Số dư</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending &&
              Array.from({ length: 5 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {data?.items.map((entry) => {
              const isInflow = entry.direction === 'inflow';
              const voided = entry.status === 'voided';
              const strike = voided ? 'line-through' : undefined;
              return (
                <TableRow
                  key={entry.uuid}
                  className="cursor-pointer"
                  onClick={() => openEntry(entry)}
                >
                  <TableCell className="text-muted-foreground">
                    {formatDate(new Date(entry.occurred_at)).slice(0, 5)}
                  </TableCell>
                  <TableCell className={strike}>
                    {entry.category?.name ?? dash}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      {voided && (
                        <Badge
                          variant="outline"
                          className="border-destructive text-destructive"
                        >
                          Đã hủy
                        </Badge>
                      )}
                      {entry.tag ? (
                        <Badge
                          variant="outline"
                          className={`border-dashed ${strike ?? ''}`}
                        >
                          {entry.tag.name}
                        </Badge>
                      ) : (
                        !voided && dash
                      )}
                    </span>
                  </TableCell>
                  <TableCell
                    className={`text-primary text-right tabular-nums ${strike ?? ''}`}
                  >
                    {isInflow ? formatAmount(entry.amount, 'VND') : dash}
                  </TableCell>
                  <TableCell
                    className={`text-destructive text-right tabular-nums ${strike ?? ''}`}
                  >
                    {isInflow ? dash : formatAmount(entry.amount, 'VND')}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {/* A voided entry nets to zero: show the balance before it. */}
                    {formatAmount(
                      voided ? entry.balance_before : entry.balance_after,
                      'VND',
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Tùy chọn"
                          />
                        }
                      >
                        <MoreHorizontal />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEntry(entry)}>
                          Xem chi tiết
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {data?.items.length === 0 && (
          <Empty className="py-12">
            <EmptyTitle>Chưa có bút toán</EmptyTitle>
            <EmptyDescription>
              Không có bút toán nào trong khoảng thời gian này.
            </EmptyDescription>
          </Empty>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
          <span className="text-muted-foreground text-sm">
            Hiển thị {from}–{to} / {totalCount ?? 0} bút toán
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
                    update({ page: page - 1 });
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
                      update({ page: n });
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
                    update({ page: page + 1 });
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
      <EntryDetailDialog
        entryUuid={search.entry}
        onEntryChange={(uuid) => update({ entry: uuid, page })}
      />
    </>
  );
}
