import {
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';

import { http } from '@/lib/clients';

import type { components } from '@/features/generated/authorization.gen';

type Schemas = components['schemas'];

export type AccessGrant = Schemas['AccessGrant'];
type ListAccessGrantsResponse = Schemas['ListAccessGrantsResponse'];
type GrantAccessRequest = Schemas['GrantAccessRequest'];
type GrantAccessResponse = Schemas['GrantAccessResponse'];

const ACCESS_GRANTS_URL = '/api/v1/access-grants';

/** What an accountant may do with the entries of one fund source. */
const ACCOUNTANT_ACTIONS: GrantAccessRequest['actions'] = [
  'create',
  'update',
  'delete',
];

export const getFundSourceScope = (fundSourceUuid: string) =>
  `fund_source/${fundSourceUuid}`;

export const accountantGrantsQueryOptions = (fundSourceUuid: string) =>
  queryOptions({
    queryKey: [ACCESS_GRANTS_URL, 'ledger_entry', fundSourceUuid],
    queryFn: async ({ signal }) => {
      const { items } = await http.get<ListAccessGrantsResponse>(
        ACCESS_GRANTS_URL,
        { params: { resource: 'ledger_entry' }, signal },
      );
      const scope = getFundSourceScope(fundSourceUuid);
      return items.filter((grant) => grant.scope === scope);
    },
  });

type GrantAccountantsInput = {
  fundSourceUuid: string;
  /** User ids to give accountant access to. */
  userIds: string[];
};

const invalidateGrants = (
  queryClient: ReturnType<typeof useQueryClient>,
  fundSourceUuid: string,
) =>
  queryClient.invalidateQueries({
    queryKey: [ACCESS_GRANTS_URL, 'ledger_entry', fundSourceUuid],
  });

/** Grants accountant access on one fund source to the given users. */
export const useGrantAccountants = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fundSourceUuid, userIds }: GrantAccountantsInput) => {
      await Promise.all(
        userIds.map((userId) =>
          http.post<GrantAccessResponse, GrantAccessRequest>(
            ACCESS_GRANTS_URL,
            {
              user_id: userId,
              resource: 'ledger_entry',
              actions: ACCOUNTANT_ACTIONS,
              scope: getFundSourceScope(fundSourceUuid),
            },
          ),
        ),
      );
    },
    onSettled: (_data, _error, { fundSourceUuid }) =>
      invalidateGrants(queryClient, fundSourceUuid),
  });
};

type RevokeAccountantInput = { fundSourceUuid: string; grantUuid: string };

/** Revokes one accountant's grant right away. */
export const useRevokeAccountant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ grantUuid }: RevokeAccountantInput) =>
      http.delete(`${ACCESS_GRANTS_URL}/${grantUuid}`),
    onSettled: (_data, _error, { fundSourceUuid }) =>
      invalidateGrants(queryClient, fundSourceUuid),
  });
};
