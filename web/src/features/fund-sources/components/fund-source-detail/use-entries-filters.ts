import { getRouteApi } from '@tanstack/react-router';

const fundSourceDetailRoute = getRouteApi('/_app/fund-sources_/$uuid/');

type EntriesFilters = ReturnType<typeof fundSourceDetailRoute.useSearch>;

/** The entries filters, kept in the URL search params of the detail route. */
export function useEntriesFilters() {
  const filters = fundSourceDetailRoute.useSearch();
  const navigate = fundSourceDetailRoute.useNavigate();

  const updateFilters = (changes: Partial<EntriesFilters>) =>
    // Any filter change returns to the first page unless a page is given.
    void navigate({
      search: (currentFilters) => ({ ...currentFilters, page: 1, ...changes }),
      replace: true,
    });

  return { filters, updateFilters };
}
