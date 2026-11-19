import { useEffect } from 'react';

import { useOrganization } from '@clerk/react';

export type OrgMember = {
  userId: string;
  name: string;
  email: string;
  imageUrl: string;
  /** Role without the Clerk `org:` prefix, e.g. `office_accountant`. */
  role: string;
};

const CLERK_ORG_ROLE_PREFIX = 'org:';

/** `org:office_accountant` -> `office_accountant`. */
export const orgRoleName = (role: string) =>
  role.replace(CLERK_ORG_ROLE_PREFIX, '');

/** Members of the active organization, as the source of accountant suggestions. */
export const useOrgMembers = () => {
  const { memberships, isLoaded } = useOrganization({
    memberships: { infinite: true, keepPreviousData: true, pageSize: 100 },
  });

  const hasMore = Boolean(memberships?.hasNextPage);
  const isFetching = Boolean(memberships?.isFetching);
  const fetchNext = memberships?.fetchNext;

  // Load every page so a name lookup never misses a member.
  useEffect(() => {
    if (hasMore && !isFetching) fetchNext?.();
  }, [hasMore, isFetching, fetchNext]);

  const members: OrgMember[] = (memberships?.data ?? []).flatMap((m) => {
    const { userId, firstName, lastName, identifier, imageUrl } =
      m.publicUserData ?? {};
    if (!userId) return [];
    const name = [firstName, lastName].filter(Boolean).join(' ');
    return [
      {
        userId,
        name: name || identifier || userId,
        email: identifier ?? '',
        imageUrl: imageUrl ?? '',
        role: orgRoleName(m.role),
      },
    ];
  });

  return {
    members,
    isLoading: !isLoaded || Boolean(memberships?.isLoading),
    hasMore,
    fetchMore: () => fetchNext?.(),
  };
};
