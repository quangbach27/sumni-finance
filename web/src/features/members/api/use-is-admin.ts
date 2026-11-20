import { useOrganization } from '@clerk/react';

import { toClerkRole } from './roles';

/** Role of the signed-in user in the active org, without loading member lists. */
export const useMyOrgRole = () => {
  const { membership, isLoaded } = useOrganization();
  const role = membership?.role.replace('org:', '') ?? '';
  return {
    isLoaded,
    role,
    isAdmin: membership?.role === toClerkRole('office_admin'),
  };
};
