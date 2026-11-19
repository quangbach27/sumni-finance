import { useSuspenseQuery } from '@tanstack/react-query';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

import { getFundSourcesQueryOptions } from '@/features/fund-sources/api/get-fund-sources';

import { getCategoriesQueryOptions } from '../../../api/get-categories';
import { usePeriodEntriesSearch } from './use-period-entries-search';

const ALL = 'all';

export default function PeriodEntriesFilterBar() {
  const { search, update } = usePeriodEntriesSearch();
  const { data } = useSuspenseQuery(getCategoriesQueryOptions());
  const { data: fundSources } = useSuspenseQuery(getFundSourcesQueryOptions());
  const category = data.items.find((c) => c.uuid === search.category);
  const fundSource = fundSources.find((f) => f.uuid === search.fundSource);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={search.category ?? ALL}
        onValueChange={(v) => {
          if (v) update({ category: v === ALL ? undefined : v });
        }}
      >
        <SelectTrigger>Danh mục: {category?.name ?? 'Tất cả'}</SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tất cả</SelectItem>
          {data.items.map((c) => (
            <SelectItem key={c.uuid} value={c.uuid}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={search.fundSource ?? ALL}
        onValueChange={(v) => {
          if (v) update({ fundSource: v === ALL ? undefined : v });
        }}
      >
        <SelectTrigger>Nguồn quỹ: {fundSource?.name ?? 'Tất cả'}</SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Tất cả</SelectItem>
          {fundSources.map((f) => (
            <SelectItem key={f.uuid} value={f.uuid}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
