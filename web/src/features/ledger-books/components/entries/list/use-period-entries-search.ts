import { getRouteApi } from '@tanstack/react-router';

const route = getRouteApi('/_app/ledger-books_/$uuid/entries/');

/** Filters, page and open dialogs, kept in the URL search params. */
export function usePeriodEntriesSearch() {
  const search = route.useSearch();
  const navigate = route.useNavigate();

  const update = (patch: Partial<typeof search>) =>
    void navigate({
      // Changing a filter returns to the first page unless a page is given;
      // opening or closing a dialog keeps the page.
      search: (prev) => ({
        ...prev,
        ...('category' in patch || 'fundSource' in patch || 'status' in patch
          ? { page: 1 }
          : {}),
        ...patch,
      }),
      replace: true,
    });

  return { search, update };
}
