import { useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { ChevronDownIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';

import { getFundSourcesQueryOptions } from '@/features/fund-sources/api/get-fund-sources';

import { cn } from '@/lib/utils';

import { allAccountantGrantsQueryOptions } from '../api/all-access-grants';
import { useSetAccountantFundSources } from '../api/set-accountant-fund-sources';

import type { FundSource } from '@/features/fund-sources/api/types';

type Props = {
  userId: string;
  userName: string;
};

const describe = (fs: FundSource) => {
  if (fs.type === 'cash') return 'Tiền mặt';
  const last4 = fs.details.account_number?.slice(-4);
  return [fs.details.bank_short_name, last4 && `•••• ${last4}`]
    .filter(Boolean)
    .join(' ');
};

/** Admin control: pick the fund sources an accountant may write entries to. */
export default function FundSourcePicker({ userId, userName }: Props) {
  const grants = useQuery(allAccountantGrantsQueryOptions());
  const fundSources = useQuery(getFundSourcesQueryOptions());
  const save = useSetAccountantFundSources();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  if (grants.isPending || fundSources.isPending) {
    return <Skeleton className="h-9 w-48" />;
  }
  if (grants.isError || fundSources.isError) {
    return <span className="text-destructive text-sm">Không thể tải</span>;
  }

  const current = grants.data[userId] ?? [];
  const currentUuids = current.map((g) => g.fundSourceUuid);
  const all = fundSources.data;
  const nameByUuid = new Map(all.map((fs) => [fs.uuid, fs.name]));
  const allSelected = all.length > 0 && draft.length === all.length;
  const unchanged =
    draft.length === currentUuids.length &&
    draft.every((uuid) => currentUuids.includes(uuid));

  const toggle = (uuid: string, checked: boolean) =>
    setDraft((ids) =>
      checked ? [...ids, uuid] : ids.filter((id) => id !== uuid),
    );

  const submit = () =>
    save.mutate(
      { userId, userName, current, selected: draft },
      { onSuccess: () => setOpen(false) },
    );

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(currentUuids);
      }}
    >
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            className="h-9 min-w-48 justify-between gap-2 px-2"
            aria-label={`Nguồn quỹ ghi được của ${userName}`}
          />
        }
      >
        {currentUuids.length === 0 ? (
          <span className="text-muted-foreground font-normal">
            Chưa được phân
          </span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {currentUuids.map((uuid) => (
              <Badge key={uuid} variant="secondary">
                {nameByUuid.get(uuid) ?? 'Nguồn quỹ'}
              </Badge>
            ))}
          </span>
        )}
        <ChevronDownIcon className="text-muted-foreground size-4 shrink-0" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-96 gap-0 p-0">
        <div className="border-b px-4 py-3">
          <p className="font-semibold">Nguồn quỹ ghi được</p>
          <p className="text-muted-foreground text-sm">{userName} · Kế toán</p>
        </div>

        <label className="bg-muted/50 flex cursor-pointer items-center gap-3 border-b px-4 py-3">
          <Checkbox
            checked={allSelected}
            indeterminate={draft.length > 0 && !allSelected}
            onCheckedChange={(checked) =>
              setDraft(checked ? all.map((fs) => fs.uuid) : [])
            }
          />
          <span className="flex-1 font-medium">Chọn tất cả</span>
          <span className="text-muted-foreground text-sm">
            {draft.length}/{all.length} quỹ
          </span>
        </label>

        <ul className="max-h-72 overflow-y-auto">
          {all.length === 0 && (
            <li className="text-muted-foreground px-4 py-3 text-sm">
              Chưa có nguồn quỹ nào.
            </li>
          )}
          {all.map((fs) => (
            <li key={fs.uuid} className="border-b last:border-b-0">
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3">
                <Checkbox
                  checked={draft.includes(fs.uuid)}
                  onCheckedChange={(checked) => toggle(fs.uuid, checked)}
                />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{fs.name}</span>
                  <span className="text-muted-foreground truncate text-sm">
                    {describe(fs)}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
          <span className={cn('text-muted-foreground text-sm')}>
            Có hiệu lực ngay khi lưu
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={save.isPending || unchanged}
              onClick={submit}
            >
              Lưu
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
