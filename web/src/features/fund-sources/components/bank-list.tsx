import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Skeleton } from '@/components/ui/skeleton';

import BankSummary from './bank-summary';
import { useBanks } from '../api/get-banks';

import type { Bank } from '../api/types';

// ui/command.tsx can't be edited, so restyle its input from here.
const COMMAND_CLASS =
  '[&_[data-slot=input-group]]:bg-background! [&_[data-slot=input-group]]:border-input!';

const searchValue = (bank: Bank) =>
  `${bank.code} ${bank.short_name} ${bank.name}`;

const filterBank = (itemValue: string, query: string) =>
  itemValue.toLowerCase().includes(query.trim().toLowerCase()) ? 1 : 0;

type BankListProps = {
  /** Selected bank code. */
  value: string;
  onSelect: (bank: Bank) => void;
  className?: string;
};

const BankListSkeleton = () => (
  <div className="flex flex-col gap-3 p-4">
    {Array.from({ length: 5 }, (_, i) => (
      <Skeleton key={i} className="h-10 w-full" />
    ))}
  </div>
);

const BankListError = ({ onRetry }: { onRetry?: () => void }) => (
  <div className="flex flex-col items-center gap-2 p-6 text-sm">
    <p className="text-muted-foreground">Không thể tải danh sách ngân hàng.</p>
    <Button type="button" variant="outline" size="sm" onClick={onRetry}>
      Thử lại
    </Button>
  </div>
);

const BankList = ({ value, onSelect, className }: BankListProps) => {
  const { data: banks = [], isPending, isError, refetch } = useBanks();

  if (isPending) return <BankListSkeleton />;
  if (isError) return <BankListError onRetry={() => void refetch()} />;

  return (
    <Command className={COMMAND_CLASS} filter={filterBank}>
      <CommandInput placeholder="Tìm ngân hàng..." />
      <CommandList className={className}>
        <CommandEmpty>Không tìm thấy ngân hàng.</CommandEmpty>
        <CommandGroup className="p-0">
          {banks.map((bank) => (
            <CommandItem
              key={bank.id}
              value={searchValue(bank)}
              data-checked={bank.code === value}
              className="gap-3 rounded-none border-b px-4 py-3 last:border-b-0"
              onSelect={() => onSelect(bank)}
            >
              <BankSummary bank={bank} />
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
};

export default BankList;
