import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ban, Eye } from 'lucide-react';

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
import CancelEntryDialog from '@/features/ledger-entries/components/cancel-entry/cancel-entry-dialog';
import EntriesPagination from '@/features/ledger-entries/components/entries-pagination';
import EntryDetailDialog from '@/features/ledger-entries/components/entry-detail/entry-detail-dialog';
import {
  VOIDED_STRIKE_CLASS_NAME,
  canCancelEntry,
  formatEntryFundSource,
} from '@/features/ledger-entries/components/entry-detail/entry-detail-format';

import { formatAmount } from '@/lib/currency';
import { formatDate } from '@/lib/date';

import { usePeriodEntriesSearch } from './use-period-entries-search';

import type { LedgerEntry } from '@/features/ledger-entries/api/types';

const dash = <span className="text-muted-foreground">—</span>;

export default function PeriodEntriesTable({
  periodUuid,
}: {
  periodUuid: string;
}) {
  const { search, update } = usePeriodEntriesSearch();
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery(
    listLedgerEntriesQueryOptions({
      ledgerPeriodUuid: periodUuid,
      categoryUuid: search.category,
      fundSourceUuid: search.fundSource,
      // Reversal entries are reached from their voided entry's details.
      kind: 'normal',
      page: search.page,
    }),
  );

  // Seed the details query with the row so the dialogs open instantly.
  const seed = (entry: LedgerEntry) =>
    queryClient.setQueryData(
      getLedgerEntryQueryOptions(entry.uuid).queryKey,
      entry,
    );
  const openEntry = (entry: LedgerEntry) => {
    seed(entry);
    update({ entry: entry.uuid });
  };
  const cancelEntry = (entry: LedgerEntry) => {
    seed(entry);
    update({ cancel: entry.uuid });
  };

  return (
    <>
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Ngày</TableHead>
              <TableHead>Nội dung</TableHead>
              <TableHead>Danh mục</TableHead>
              <TableHead>Thẻ</TableHead>
              <TableHead>Nguồn quỹ</TableHead>
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
                  <TableCell colSpan={9}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {data?.items.map((entry) => {
              const inflow = entry.direction === 'inflow';
              const voided = entry.status === 'voided';
              const strike = voided ? VOIDED_STRIKE_CLASS_NAME : '';
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
                    <div className="flex flex-col gap-1">
                      <span className={`truncate font-medium ${strike}`}>
                        {entry.description}
                      </span>
                      {voided && (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-destructive text-destructive shrink-0"
                          >
                            Đã hủy
                          </Badge>
                          {entry.voided_reason && (
                            <span
                              className="text-muted-foreground truncate text-xs"
                              title={entry.voided_reason}
                            >
                              {entry.voided_reason}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className={strike}>
                    {entry.category?.name ?? dash}
                  </TableCell>
                  <TableCell>
                    {entry.tag ? (
                      <Badge
                        variant="outline"
                        className={`border-dashed ${strike}`}
                      >
                        {entry.tag.name}
                      </Badge>
                    ) : (
                      dash
                    )}
                  </TableCell>
                  <TableCell className={strike}>
                    {formatEntryFundSource(entry)}
                  </TableCell>
                  <TableCell
                    className={`text-primary text-right tabular-nums ${strike}`}
                  >
                    {inflow ? formatAmount(entry.amount, 'VND') : dash}
                  </TableCell>
                  <TableCell
                    className={`text-destructive text-right tabular-nums ${strike}`}
                  >
                    {inflow ? dash : formatAmount(entry.amount, 'VND')}
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
                        ...(canCancelEntry(entry)
                          ? [
                              {
                                key: 'cancel',
                                label: 'Hủy bút toán',
                                icon: Ban,
                                onSelect: () => cancelEntry(entry),
                                destructive: true,
                              },
                            ]
                          : []),
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
              Không có bút toán nào khớp với bộ lọc.
            </EmptyDescription>
          </Empty>
        )}

        <EntriesPagination
          page={search.page}
          pageSize={data?.page_info.page_size ?? 10}
          totalCount={data?.page_info.total_count ?? 0}
          onPageChange={(page) => update({ page })}
        />
      </div>

      <EntryDetailDialog
        entryUuid={search.entry}
        onEntryChange={(uuid) => update({ entry: uuid })}
        onCancelEntry={(uuid) => update({ entry: undefined, cancel: uuid })}
      />
      <CancelEntryDialog
        entryUuid={search.cancel}
        onClose={() => update({ cancel: undefined })}
      />
    </>
  );
}
