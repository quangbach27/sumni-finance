import { useState } from 'react';

import { ChevronsUpDown, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { useIsMobile } from '@/hooks/use-mobile';

import { useBanks } from '../api/get-banks';
import BankList from './bank-list';
import BankSummary from './bank-summary';

import type { Bank } from '../api/types';

type BankComboboxProps = {
  /** Selected bank code. */
  value: string;
  onBankSelect: (bank: Bank) => void;
  invalid?: boolean;
  id?: string;
};

type PickerProps = {
  trigger: React.ReactElement;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

const BankDrawer = ({ trigger, open, onOpenChange, children }: PickerProps) => (
  <>
    {trigger}
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent className="h-[85dvh]">
        <DrawerHeader className="flex-row items-center justify-between pb-2">
          <DrawerTitle>Chọn ngân hàng</DrawerTitle>
          <DrawerClose
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Đóng"
              />
            }
          >
            <X />
          </DrawerClose>
        </DrawerHeader>
        <div className="min-h-0 flex-1 px-2 pb-4">{children}</div>
      </DrawerContent>
    </Drawer>
  </>
);

const BankPopover = ({
  trigger,
  open,
  onOpenChange,
  children,
}: PickerProps) => (
  <Popover open={open} onOpenChange={onOpenChange}>
    <PopoverTrigger render={trigger} />
    <PopoverContent className="w-(--anchor-width) p-0" align="start">
      {children}
    </PopoverContent>
  </Popover>
);

export default function BankCombobox({
  value,
  onBankSelect,
  invalid,
  id,
}: BankComboboxProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  // Same query as BankList's; TanStack Query dedupes it into one request.
  const { data: banks = [] } = useBanks();
  const selected = banks.find((bank) => bank.code === value);

  const handleSelect = (bank: Bank) => {
    onBankSelect(bank);
    setOpen(false);
  };

  const trigger = (
    <Button
      id={id}
      type="button"
      variant="outline"
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-invalid={invalid}
      className="h-12 w-full justify-between font-normal"
      onClick={isMobile ? () => setOpen(true) : undefined}
    >
      {selected ? (
        <span className="flex min-w-0 items-center gap-2">
          <BankSummary bank={selected} />
        </span>
      ) : (
        <span className="text-placeholder">Chọn ngân hàng</span>
      )}
      <ChevronsUpDown className="opacity-50" />
    </Button>
  );

  const Picker = isMobile ? BankDrawer : BankPopover;

  return (
    <Picker trigger={trigger} open={open} onOpenChange={setOpen}>
      <BankList
        value={value}
        onSelect={handleSelect}
        className={isMobile ? 'mt-3 max-h-none flex-1' : 'mt-3'}
      />
    </Picker>
  );
}
