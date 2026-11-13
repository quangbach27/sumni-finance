import { useOrganization } from '@clerk/react';

export type OrgMember = {
  userId: string;
  name: string;
  email: string;
  imageUrl: string;
};

/** Members of the active organization, as the source of accountant suggestions. */
export const useOrgMembers = () => {
  const { memberships, isLoaded } = useOrganization({
    memberships: { infinite: true, keepPreviousData: true },
  });

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
      },
    ];
  });

  return {
    members,
    isLoading: !isLoaded || Boolean(memberships?.isLoading),
    hasMore: Boolean(memberships?.hasNextPage),
    fetchMore: () => memberships?.fetchNext?.(),
  };
};
