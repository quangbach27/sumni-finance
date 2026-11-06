import { createFileRoute } from '@tanstack/react-router';
import { Plus } from 'lucide-react';

import ContentLayout from '@/components/layout/content-layout/content-layout';

import OpenLedgerPeriodTrigger from '@/features/ledger-books/components/open-ledger-period-trigger';

export const Route = createFileRoute('/_app/ledger-books')({
  staticData: { crumb: 'Sổ cái' },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ContentLayout
      title="Sổ cái"
      description="Mỗi kỳ ghi bút toán và cập nhật số dư nguồn quỹ. Chỉ một kỳ được mở tại một thời điểm"
      additionalContent={
        <OpenLedgerPeriodTrigger>
          <Plus data-icon="inline-start" />
          <span>Mở kỳ mới</span>
        </OpenLedgerPeriodTrigger>
      }
    >
      Sổ cái
    </ContentLayout>
  );
}
