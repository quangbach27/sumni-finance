import { useSuspenseQuery } from '@tanstack/react-query';
import { Pencil, QrCode } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { LazyDialogTrigger } from '@/components/shared/lazy-trigger/lazy-trigger';

import { getFundSourceQueryOptions } from '../../api/get-fund-source';
import FundSourceAvatar from '../fund-source-avatar';
import { maskAccountNumber } from '../fund-source-summary';

const loadVietQr = () => import('../actions/vietqr/vietqr-action-dialog');

export default function FundSourceDetailHeader({
  fundSourceUuid,
}: {
  fundSourceUuid: string;
}) {
  const { data } = useSuspenseQuery(getFundSourceQueryOptions(fundSourceUuid));
  const { fundSource } = data;
  const { bank_short_name, account_number, owner_name } = fundSource.details;

  const subtitle = [
    bank_short_name,
    account_number ? maskAccountNumber(account_number) : undefined,
    `Chủ sở hữu ${owner_name}`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <FundSourceAvatar item={fundSource} />
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">{fundSource.name}</h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
      </div>
      <div className="flex gap-2">
        {fundSource.type === 'bank' && (
          <LazyDialogTrigger load={loadVietQr} dialogProps={{ fundSource }}>
            {(trigger) => (
              <Button variant="outline" {...trigger}>
                <QrCode data-icon="inline-start" />
                Tạo mã VietQR
              </Button>
            )}
          </LazyDialogTrigger>
        )}
        {/* Editing a fund source is not built yet. */}
        <Button variant="outline" disabled>
          <Pencil data-icon="inline-start" />
          Sửa
        </Button>
      </div>
    </div>
  );
}
