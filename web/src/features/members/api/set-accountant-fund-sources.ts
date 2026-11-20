import { useMutation, useQueryClient } from '@tanstack/react-query';

import { toast } from '@/components/ui/toast';

import { getFundSourceScope } from '@/features/fund-sources/api/access-grants';
import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import { http } from '@/lib/clients';

import type { FundSourceGrant } from './all-access-grants';

const ACCESS_GRANTS_URL = '/api/v1/access-grants';

type Input = {
  userId: string;
  userName: string;
  /** Grants the user holds now. */
  current: FundSourceGrant[];
  /** Fund source uuids the user should be able to write to. */
  selected: string[];
};

/** Grants and revokes the difference between the current and selected fund sources. */
export const useSetAccountantFundSources = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, current, selected }: Input) => {
      const currentUuids = new Set(current.map((g) => g.fundSourceUuid));
      const toAdd = selected.filter((uuid) => !currentUuids.has(uuid));
      const toRevoke = current.filter(
        (g) => !selected.includes(g.fundSourceUuid),
      );

      await Promise.all([
        ...toAdd.map((uuid) =>
          http.post(ACCESS_GRANTS_URL, {
            user_id: userId,
            resource: 'ledger_entry',
            actions: ['create', 'update', 'delete'],
            scope: getFundSourceScope(uuid),
          }),
        ),
        ...toRevoke.map((g) =>
          http.delete(`${ACCESS_GRANTS_URL}/${g.grantUuid}`),
        ),
      ]);
    },
    onSuccess: (_data, { userName }) =>
      toast.add({
        type: 'success',
        title: `Đã cập nhật nguồn quỹ của ${userName}.`,
      }),
    onError: (error) =>
      toast.add({
        type: 'error',
        title: 'Không thể cập nhật nguồn quỹ.',
        description: formatApiError(error, 'Vui lòng thử lại.').message,
      }),
    // Partial failures leave some grants applied, so always refetch.
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: [ACCESS_GRANTS_URL] }),
  });
};
