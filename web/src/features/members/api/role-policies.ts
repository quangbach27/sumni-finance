import { queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import type { components } from '@/features/generated/authorization.gen';

export type RolePolicies = components['schemas']['RolePolicies'];
type ListRolePoliciesResponse =
  components['schemas']['ListRolePoliciesResponse'];

const ROLE_POLICIES_URL = '/api/v1/role-policies';

/** Baseline permissions of every role, as defined by the backend policy catalog. */
export const rolePoliciesQueryOptions = () =>
  queryOptions({
    queryKey: [ROLE_POLICIES_URL],
    queryFn: async ({ signal }) => {
      const { items } = await http.get<ListRolePoliciesResponse>(
        ROLE_POLICIES_URL,
        { signal },
      );
      return items;
    },
    // Static configuration: it only changes with a deploy.
    staleTime: Infinity,
  });
