import { ArrowRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

import { useUser } from '@/hooks/use-user';
import { formatAmount } from '@/lib/currency';
import { formatDate } from '@/lib/date';

import EntryDetailField from './entry-detail-field';
import {
  formatDayTime,
  formatEntryFundSource,
  isInflow,
} from './entry-detail-format';

import type { LedgerEntry } from '../../api/types';

export const normalEntrySubtitle = (entry: LedgerEntry) =>
  [
    formatDate(new Date(entry.occurred_at)),
    entry.category?.name,
    `Kỳ ${entry.ledger_period.name}${entry.ledger_period.status === 'opened' ? ' đang mở' : ''}`,
  ]
    .filter(Boolean)
    .join(' · ');

export default function EntryDetailNormal({ entry }: { entry: LedgerEntry }) {
  const inflow = isInflow(entry);
  const creator = useUser(entry.created_by);

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-muted/40 flex flex-wrap items-end justify-between gap-4 rounded-xl border p-5">
        <div>
          <p className="text-muted-foreground text-sm">
            {inflow ? 'Nợ · thu vào' : 'Có · chi ra'}
          </p>
          <p
            className={`text-4xl font-bold tabular-nums ${inflow ? 'text-primary' : 'text-destructive'}`}
          >
            {inflow ? '+' : '−'}
            {formatAmount(entry.amount, 'VND')} ₫
          </p>
        </div>
        <div className="text-right">
          <p className="text-muted-foreground text-sm">Số dư nguồn quỹ</p>
          <p className="flex items-center justify-end gap-2 tabular-nums">
            <span className="text-muted-foreground">
              {formatAmount(entry.balance_before, 'VND')}
            </span>
            <ArrowRight className="text-muted-foreground size-4" />
            <span className="text-lg font-bold">
              {formatAmount(entry.balance_after, 'VND')}
            </span>
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        <EntryDetailField label="Nội dung" className="col-span-full">
          <span className="break-words whitespace-pre-wrap">
            {entry.description}
          </span>
        </EntryDetailField>
        <EntryDetailField label="Ngày phát sinh">
          {formatDate(new Date(entry.occurred_at))}
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
        <EntryDetailField label="Nguồn quỹ">
          {formatEntryFundSource(entry)}
        </EntryDetailField>
        <EntryDetailField label="Người ghi">{creator.name}</EntryDetailField>
        <EntryDetailField label="Ghi lúc">
          {formatDayTime(entry.created_at)}
        </EntryDetailField>
      </dl>
    </div>
  );
}
