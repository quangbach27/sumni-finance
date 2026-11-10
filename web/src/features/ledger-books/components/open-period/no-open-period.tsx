import { useSuspenseQuery } from '@tanstack/react-query';
import { BookOpen, Plus } from 'lucide-react';

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';

import { getLedgerPeriodsQueryOptions } from '../../api/get-ledger-periods';
import { getOpenLedgerPeriodDefaultValues } from '../../api/open-ledger-period';
import OpenLedgerPeriodTrigger from './open-ledger-period-trigger';

export default function NoOpenPeriod() {
  const { data } = useSuspenseQuery(
    getLedgerPeriodsQueryOptions({ status: 'reconciled', pageSize: 1 }),
  );
  const previous = data.items.at(0);
  const next = getOpenLedgerPeriodDefaultValues(previous?.closeDate).name;
  return (
    <Empty className="mt-6 border border-dashed py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <BookOpen />
        </EmptyMedia>
        <EmptyTitle>Chưa có kỳ nào đang mở</EmptyTitle>
        <EmptyDescription>
          {previous ? `Kỳ ${previous.name} đã đối soát. ` : ''}Mở kỳ {next} để
          tiếp tục ghi bút toán, số dư đầu kỳ lấy từ số dư thực tế đã đối soát.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <OpenLedgerPeriodTrigger className="h-10 w-full md:w-auto">
          <Plus data-icon="inline-start" />
          <span>Mở kỳ {next}</span>
        </OpenLedgerPeriodTrigger>
      </EmptyContent>
    </Empty>
  );
}
