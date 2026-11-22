import { useSuspenseQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

import { getCategoriesQueryOptions } from '@/features/ledger-books/api/get-categories';
import { ENTRY_STATUS_OPTIONS } from '@/features/ledger-entries/components/entries-status-options';

import { useEntriesFilters } from './use-entries-filters';

const ALL = 'all';
const RANGES = [1, 2, 3, 6] as const;

export default function FundSourceEntriesFilterBar({
  totalCount,
}: {
  totalCount?: number;
}) {
  const { filters, updateFilters } = useEntriesFilters();
  const { data } = useSuspenseQuery(getCategoriesQueryOptions());
  const categories = data.items;
  const category = categories.find((c) => c.uuid === filters.category);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search is UI-only for now. */}
      <InputGroup className="sm:max-w-xs">
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
        <InputGroupInput placeholder="Tìm bút toán…" />
      </InputGroup>

      <Select
        value={String(filters.range)}
        onValueChange={(v) => {
          if (v) updateFilters({ range: Number(v) as (typeof RANGES)[number] });
        }}
      >
        <SelectTrigger>{filters.range} tháng gần nhất</SelectTrigger>
        <SelectContent>
          {RANGES.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {m} tháng gần nhất
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.category ?? ALL}
        onValueChange={(v) => {
          if (v) updateFilters({ category: v === ALL ? undefined : v });
        }}
      >
        <SelectTrigger>Danh mục: {category?.name ?? 'Tất cả'}</SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tất cả</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.uuid} value={c.uuid}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status}
        onValueChange={(v) => {
          if (v) updateFilters({ status: v });
        }}
      >
        <SelectTrigger>
          Trạng thái:{' '}
          {ENTRY_STATUS_OPTIONS.find((s) => s.value === filters.status)?.label}
        </SelectTrigger>
        <SelectContent>
          {ENTRY_STATUS_OPTIONS.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {totalCount !== undefined && (
        <span className="text-muted-foreground ml-auto text-sm">
          {filters.range} tháng gần nhất · {totalCount} bút toán
        </span>
      )}
    </div>
  );
}
