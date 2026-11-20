import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';

import { useUser } from '@/hooks/use-user';
import { formatAmount } from '@/lib/currency';
import { formatDate } from '@/lib/date';

import { getLedgerEntryQueryOptions } from '../../api/get-ledger-entry';
import EntryDetailField from './entry-detail-field';
import {
  formatDayTime,
  formatEntryFundSource,
  isInflow,
} from './entry-detail-format';

import type { LedgerEntry } from '../../api/types';

export const voidedEntrySubtitle = (entry: LedgerEntry) =>
  [
    formatDate(new Date(entry.occurred_at)),
    entry.category?.name,
    entry.tag?.name,
  ]
    .filter(Boolean)
    .join(' · ');

const signed = (entry: LedgerEntry) =>
  `${isInflow(entry) ? '+' : '−'}${formatAmount(entry.amount, 'VND')}`;

export default function EntryDetailVoided({
  entry,
  onSelectEntry,
}: {
  entry: LedgerEntry;
  /** Opens the details of another entry (the reversal). */
  onSelectEntry: (uuid: string) => void;
}) {
  const creator = useUser(entry.created_by);
  const voider = useUser(entry.voided_by ?? '');
  const reversalUuid = entry.reversed_by_entry_uuid;
  const { data: reversal } = useQuery({
    ...getLedgerEntryQueryOptions(reversalUuid ?? ''),
    enabled: Boolean(reversalUuid),
  });

  // The reversal cancels the original, so the net effect is the sum of both.
  const net = reversal
    ? (isInflow(entry) ? entry.amount : -entry.amount) +
      (isInflow(reversal) ? reversal.amount : -reversal.amount)
    : 0;

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <span className="text-muted-foreground w-12">
            {formatDate(new Date(entry.occurred_at))}
          </span>
          <span className="font-medium">Bút toán gốc</span>
          <Badge
            variant="outline"
            className="border-destructive text-destructive"
          >
            Đã hủy
          </Badge>
          <span className="text-muted-foreground ml-auto font-semibold tabular-nums line-through">
            {signed(entry)}
          </span>
        </div>
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <span className="text-muted-foreground w-12">
            {reversal ? formatDate(new Date(reversal.occurred_at)) : ''}
          </span>
          <span className="font-medium">Bút toán đảo</span>
          {reversalUuid && (
            <button
              type="button"
              className="text-primary text-sm font-medium hover:underline"
              onClick={() => onSelectEntry(reversalUuid)}
            >
              Xem ›
            </button>
          )}
          <span className="text-primary ml-auto font-semibold tabular-nums">
            {reversal ? signed(reversal) : '…'}
          </span>
        </div>
        <div className="bg-muted/40 flex items-center justify-between px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            Ảnh hưởng ròng lên số dư
          </span>
          <span className="font-semibold tabular-nums">
            {formatAmount(net, 'VND')} ₫
          </span>
        </div>
      </div>

      <div className="border-destructive/30 bg-destructive/5 rounded-xl border p-4">
        <p className="text-destructive text-xs font-semibold tracking-wide uppercase">
          Lý do hủy
        </p>
        <p className="mt-1 text-lg font-medium">{entry.voided_reason ?? '—'}</p>
        {entry.voided_at && (
          <p className="text-muted-foreground text-sm">
            {entry.voided_by ? `${voider.name} · ` : ''}
            {formatDayTime(entry.voided_at)}
          </p>
        )}
      </div>

      <div>
        <p className="text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase">
          Thông tin bút toán gốc
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <EntryDetailField label="Nguồn quỹ">
            {formatEntryFundSource(entry)}
          </EntryDetailField>
          <EntryDetailField label="Danh mục">
            {entry.category?.name ?? '—'}
          </EntryDetailField>
          <EntryDetailField label="Thẻ">
            {entry.tag ? (
              <Badge variant="secondary">{entry.tag.name}</Badge>
            ) : (
              '—'
            )}
          </EntryDetailField>
          <EntryDetailField label="Ngày phát sinh">
            {formatDate(new Date(entry.occurred_at))}
          </EntryDetailField>
          <EntryDetailField label="Người ghi">{creator.name}</EntryDetailField>
          <EntryDetailField label="Ghi lúc">
            {formatDayTime(entry.created_at)}
          </EntryDetailField>
        </dl>
      </div>
    </div>
  );
}
