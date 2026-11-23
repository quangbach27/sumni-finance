import { getRouteApi } from '@tanstack/react-router';

const rolesRoute = getRouteApi('/_app/settings_/roles');

type MembersSearch = ReturnType<typeof rolesRoute.useSearch>;

/** The active tab and invitation filter, kept in the URL search params. */
export function useMembersSearch() {
  const search = rolesRoute.useSearch();
  const navigate = rolesRoute.useNavigate();

  const updateSearch = (changes: Partial<MembersSearch>) =>
    void navigate({
      search: (current) => ({ ...current, ...changes }),
      replace: true,
    });

  return { search, updateSearch };
}
