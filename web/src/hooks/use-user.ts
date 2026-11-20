import { useOrgMembers } from './use-org-members';

import type { OrgMember } from './use-org-members';

/**
 * Resolves a user id to the organization member (name, email, avatar).
 * Falls back to the id as the name while loading or when the user is no
 * longer a member.
 */
export const useUser = (userId: string): OrgMember => {
  const { members } = useOrgMembers();
  return (
    members.find((member) => member.userId === userId) ?? {
      userId,
      name: userId,
      email: '',
      imageUrl: '',
      role: '',
    }
  );
};
