import { getRouteApi } from '@tanstack/react-router';

const periodEntriesRoute = getRouteApi('/_app/ledger-books_/$uuid/entries/');

type PeriodEntriesFilters = ReturnType<typeof periodEntriesRoute.useSearch>;

/** Filters, page and open dialogs, kept in the URL search params. */
export function usePeriodEntriesFilters() {
  const filters = periodEntriesRoute.useSearch();
  const navigate = periodEntriesRoute.useNavigate();

  const updateFilters = (changes: Partial<PeriodEntriesFilters>) =>
    void navigate({
      // Changing a filter returns to the first page unless a page is given;
      // opening or closing a dialog keeps the page.
      search: (currentFilters) => ({
        ...currentFilters,
        ...('category' in changes ||
        'fundSource' in changes ||
        'status' in changes ||
        'pageSize' in changes
          ? { page: 1 }
          : {}),
        ...changes,
      }),
      replace: true,
    });

  return { filters, updateFilters };
}
