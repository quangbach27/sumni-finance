import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';

import { getFundSourcesQueryOptions } from '@/features/fund-sources/api/get-fund-sources';

import { allAccountantGrantsQueryOptions } from '../api/all-access-grants';

type Props = {
  userId: string;
  role: string;
};

/** Which fund sources a member can write entries to. */
export default function WritableFundSources({ userId, role }: Props) {
  if (role === 'office_admin') return <span>Tất cả nguồn quỹ</span>;
  if (role !== 'office_accountant') {
    return <span className="text-muted-foreground">Không có</span>;
  }
  return <AccountantFundSources userId={userId} />;
}

function AccountantFundSources({ userId }: { userId: string }) {
  const grants = useQuery(allAccountantGrantsQueryOptions());

  if (grants.isPending) {
    return <span className="text-muted-foreground">Đang tải…</span>;
  }
  if (grants.isError) {
    return <span className="text-destructive text-sm">Không thể tải</span>;
  }

  return (
    <FundSourceBadges
      uuids={(grants.data[userId] ?? []).map((g) => g.fundSourceUuid)}
    />
  );
}

/** Fund source names for the given uuids, or "Chưa được phân" when empty. */
export function FundSourceBadges({ uuids }: { uuids: string[] }) {
  const fundSources = useQuery(getFundSourcesQueryOptions());

  if (uuids.length === 0) {
    return <span className="text-muted-foreground">Chưa được phân</span>;
  }

  const nameByUuid = new Map(
    (fundSources.data ?? []).map((fs) => [fs.uuid, fs.name]),
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {uuids.map((uuid) => (
        <Badge key={uuid} variant="secondary">
          {nameByUuid.get(uuid) ?? 'Nguồn quỹ'}
        </Badge>
      ))}
    </div>
  );
}
