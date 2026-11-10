import { useMutation, useQueryClient } from '@tanstack/react-query';

import { http } from '@/lib/clients';
import { parseDateString, startOfDay } from '@/lib/date';

import { LEDGER_PERIODS_URL } from './get-ledger-periods';
import { invalidateLedgerPeriods } from './invalidate-ledger-periods';

import type { components } from '@/features/generated/ledgers.gen';

type Schemas = components['schemas'];
export type PostLedgerEntriesRequest = Schemas['PostLedgerEntriesRequest'];
export type PostLedgerEntriesResponse = Schemas['PostLedgerEntriesResponse'];

export type LedgerEntryDraft = {
  /** `YYYY-MM-DD`. */
  date: string;
  description: string;
  /** Always positive. */
  amount: number;
  direction: 'inflow' | 'outflow';
  /** The tag when one is chosen, otherwise the category. */
  categoryUuid?: string;
};

type PostLedgerEntriesInput = {
  periodUuid: string;
  fundSourceUuid: string;
  entries: LedgerEntryDraft[];
};

const toRequest = ({
  fundSourceUuid,
  entries,
}: PostLedgerEntriesInput): PostLedgerEntriesRequest => ({
  fund_source_uuid: fundSourceUuid,
  entries: entries.map((e) => ({
    amount: e.amount,
    direction: e.direction,
    description: e.description,
    category_uuid: e.categoryUuid,
    occurred_at: startOfDay(parseDateString(e.date)!).toISOString(),
  })),
});

const postLedgerEntries = (input: PostLedgerEntriesInput) =>
  http.post<PostLedgerEntriesResponse, PostLedgerEntriesRequest>(
    `${LEDGER_PERIODS_URL}/${input.periodUuid}/entries`,
    toRequest(input),
  );

export const usePostLedgerEntries = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postLedgerEntries,
    onSuccess: () => invalidateLedgerPeriods(queryClient),
  });
};
