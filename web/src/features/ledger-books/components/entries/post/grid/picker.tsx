import { useContext, useState } from 'react';

import { ChevronDown } from 'lucide-react';

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

import { GridNavContext } from './grid-nav-context';

import type { LedgerEntryRow } from '../post-journal-entries-schema';
import type { Option } from './category-lookup';
import type { CellProps } from 'react-datasheet-grid';

/** Column options shared by the picker columns (category, tag). */
export const pickerColumnOptions = {
  disableKeys: true,
  keepFocus: true,
} as const;

type PickerProps = {
  focus: boolean;
  stopEditing: CellProps<LedgerEntryRow, unknown>['stopEditing'];
  rowIndex: number;
  columnIndex: number;
  value: string;
  options: Option[];
  placeholder: string;
  emptyText: React.ReactNode;
  onPick: (uuid: string) => void;
  footer?: (search: string, done: () => void) => React.ReactNode;
  disabled?: boolean;
};

/** A cell that shows the picked name and opens a searchable list while editing. */
export default function Picker({
  focus,
  stopEditing,
  rowIndex,
  columnIndex,
  value,
  options,
  placeholder,
  emptyText,
  onPick,
  footer,
  disabled,
}: PickerProps) {
  const [search, setSearch] = useState('');
  const current = options.find((o) => o.uuid === value);
  const advance = useContext(GridNavContext);
  const close = () => {
    setSearch('');
    stopEditing({ nextRow: false });
  };
  const closeAndAdvance = () => {
    close();
    advance(rowIndex, columnIndex);
  };

  return (
    <Popover
      open={focus && !disabled}
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <PopoverTrigger
        nativeButton={false}
        render={<div />}
        className="flex size-full items-center justify-between px-5 text-base"
        style={{ pointerEvents: 'none' }}
      >
        <span className="truncate">{current?.name}</span>
        {focus && <ChevronDown className="text-muted-foreground size-4" />}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput
            autoFocus
            value={search}
            onValueChange={setSearch}
            placeholder={placeholder}
          />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem
                  key={o.uuid}
                  value={o.name}
                  data-checked={o.uuid === value}
                  onSelect={() => {
                    onPick(o.uuid);
                    closeAndAdvance();
                  }}
                >
                  {o.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {footer?.(search, closeAndAdvance)}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
