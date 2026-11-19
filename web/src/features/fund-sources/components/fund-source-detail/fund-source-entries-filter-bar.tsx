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

import { useEntriesSearch } from './use-entries-search';

const ALL = 'all';
const RANGES = [1, 2, 3, 6] as const;

export default function FundSourceEntriesFilterBar({
  totalCount,
}: {
  totalCount?: number;
}) {
  const { search, update } = useEntriesSearch();
  const { data } = useSuspenseQuery(getCategoriesQueryOptions());
  const categories = data.items;
  const category = categories.find((c) => c.uuid === search.category);

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
        value={String(search.range)}
        onValueChange={(v) => {
          if (v) update({ range: Number(v) as (typeof RANGES)[number] });
        }}
      >
        <SelectTrigger>{search.range} tháng gần nhất</SelectTrigger>
        <SelectContent>
          {RANGES.map((m) => (
            <SelectItem key={m} value={String(m)}>
              {m} tháng gần nhất
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={search.category ?? ALL}
        onValueChange={(v) => {
          if (v) update({ category: v === ALL ? undefined : v });
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

      {totalCount !== undefined && (
        <span className="text-muted-foreground ml-auto text-sm">
          {search.range} tháng gần nhất · {totalCount} bút toán
        </span>
      )}
    </div>
  );
}
