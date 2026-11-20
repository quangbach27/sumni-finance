import { getRouteApi } from '@tanstack/react-router';

const route = getRouteApi('/_app/fund-sources_/$uuid/');

/** The entries filters, kept in the URL search params of the detail route. */
export function useEntriesSearch() {
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const update = (patch: Partial<typeof search>) =>
    // Any filter change returns to the first page unless a page is given.
    void navigate({
      search: (prev) => ({ ...prev, page: 1, ...patch }),
      replace: true,
    });

  return { search, update };
}
