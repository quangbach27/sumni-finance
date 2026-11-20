import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import RowActionsMenu from '@/components/shared/row-actions/row-actions-menu';

import { getLedgerEntryQueryOptions } from '@/features/ledger-entries/api/get-ledger-entry';
import { listLedgerEntriesQueryOptions } from '@/features/ledger-entries/api/list-ledger-entries';
import EntriesPagination from '@/features/ledger-entries/components/entries-pagination';
import EntryDetailDialog from '@/features/ledger-entries/components/entry-detail/entry-detail-dialog';
import { VOIDED_STRIKE_CLASS_NAME } from '@/features/ledger-entries/components/entry-detail/entry-detail-format';

import { formatAmount } from '@/lib/currency';
import { formatDate } from '@/lib/date';

import FundSourceEntriesFilterBar from './fund-source-entries-filter-bar';
import { useEntriesParams } from './use-entries-params';
import { useEntriesSearch } from './use-entries-search';

import type { LedgerEntry } from '@/features/ledger-entries/api/types';

const dash = <span className="text-muted-foreground">—</span>;

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
              <TableHead>Ngày</TableHead>
              <TableHead>Nội dung</TableHead>
              <TableHead>Danh mục</TableHead>
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
                  <TableCell colSpan={8}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {data?.items.map((entry) => {
              const isInflow = entry.direction === 'inflow';
              const voided = entry.status === 'voided';
              const strike = voided ? VOIDED_STRIKE_CLASS_NAME : undefined;
              return (
                <TableRow
                  key={entry.uuid}
                  className="cursor-pointer"
                  onClick={() => openEntry(entry)}
                >
                  <TableCell className="text-muted-foreground">
                    {formatDate(new Date(entry.occurred_at))}
                  </TableCell>
                  <TableCell className="max-w-56">
                    <span
                      className={`block truncate ${strike ?? ''}`}
                      title={entry.description}
                    >
                      {entry.description}
                    </span>
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
                      {voided && entry.voided_reason && (
                        <span
                          className="text-muted-foreground truncate text-xs"
                          title={entry.voided_reason}
                        >
                          {entry.voided_reason}
                        </span>
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
                    <RowActionsMenu
                      actions={[
                        {
                          key: 'view',
                          label: 'Xem chi tiết',
                          icon: Eye,
                          onSelect: () => openEntry(entry),
                        },
                      ]}
                    />
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

        <EntriesPagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount ?? 0}
          onPageChange={(p) => update({ page: p })}
        />
      </div>
      <EntryDetailDialog
        entryUuid={search.entry}
        onEntryChange={(uuid) => update({ entry: uuid, page })}
      />
    </>
  );
}
