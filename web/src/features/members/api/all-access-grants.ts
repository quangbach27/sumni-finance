import { queryOptions } from '@tanstack/react-query';

import { http } from '@/lib/clients';

import type { components } from '@/features/generated/authorization.gen';

type ListAccessGrantsResponse =
  components['schemas']['ListAccessGrantsResponse'];

const ACCESS_GRANTS_URL = '/api/v1/access-grants';
const FUND_SOURCE_SCOPE_PREFIX = 'fund_source/';

export type FundSourceGrant = { grantUuid: string; fundSourceUuid: string };

/** Fund source grants each user holds for writing entries, keyed by user id. */
export const allAccountantGrantsQueryOptions = () =>
  queryOptions({
    queryKey: [ACCESS_GRANTS_URL, 'ledger_entry', 'all'],
    queryFn: async ({ signal }) => {
      const { items } = await http.get<ListAccessGrantsResponse>(
        ACCESS_GRANTS_URL,
        { params: { resource: 'ledger_entry' }, signal },
      );

      const byUser: Record<string, FundSourceGrant[]> = {};
      for (const grant of items) {
        if (!grant.scope?.startsWith(FUND_SOURCE_SCOPE_PREFIX)) continue;
        const fundSourceUuid = grant.scope.slice(
          FUND_SOURCE_SCOPE_PREFIX.length,
        );
        (byUser[grant.user_id] ??= []).push({
          grantUuid: grant.uuid,
          fundSourceUuid,
        });
      }
      return byUser;
    },
  });
