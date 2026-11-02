import { useState } from 'react';

import { ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { useBanks } from '../api/get-banks';

import type { Bank } from '../api/types';

type BankComboboxProps = {
  /** Selected bank code. */
  value: string;
  onBankSelect: (bank: Bank) => void;
  invalid?: boolean;
  id?: string;
};

function BankIcon({ bank }: { bank: Bank }) {
  return (
    <span className="bg-muted flex h-8 w-10 shrink-0 items-center justify-center rounded-md">
      <img
        src={bank.icon_url}
        alt=""
        className="h-5 w-8 object-contain"
        loading="lazy"
      />
    </span>
  );
}

export function BankCombobox({
  value,
  onBankSelect,
  invalid,
  id,
}: BankComboboxProps) {
  const { data: banks = [] } = useBanks();
  const [open, setOpen] = useState(false);

  const selected = banks.find((bank) => bank.code === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            className="h-12 w-full justify-between font-normal"
          />
        }
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            <BankIcon bank={selected} />
            <span className="font-medium">{selected.code}</span>
            <span className="text-muted-foreground truncate">
              {selected.name}
            </span>
          </span>
        ) : (
          <span className="text-placeholder">Chọn ngân hàng</span>
        )}
        <ChevronsUpDown className="opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-(--anchor-width) p-0" align="start">
        <Command
          filter={(itemValue, query) =>
            itemValue.toLowerCase().includes(query.trim().toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput placeholder="Tìm ngân hàng..." />
          <CommandList>
            <CommandEmpty>Không tìm thấy ngân hàng.</CommandEmpty>
            <CommandGroup>
              {banks.map((bank) => (
                <CommandItem
                  key={bank.id}
                  value={`${bank.code} ${bank.short_name} ${bank.name}`}
                  data-checked={bank.code === value}
                  onSelect={() => {
                    onBankSelect(bank);
                    setOpen(false);
                  }}
                >
                  <BankIcon bank={bank} />
                  <span className="font-medium">{bank.code}</span>
                  <span className="text-muted-foreground truncate">
                    {bank.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
