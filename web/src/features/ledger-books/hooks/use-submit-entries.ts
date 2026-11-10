import { useState } from 'react';

import { useNavigate } from '@tanstack/react-router';

import { formatApiError } from '@/features/fund-sources/api/format-api-error';

import { usePostLedgerEntries } from '../api/post-ledger-entries';
import {
  mapServerErrorsToRows,
  toDrafts,
} from '../components/entries/post/post-journal-entries-model';

import type { LedgerEntriesFormValues } from '../components/entries/post/post-journal-entries-schema';
import type { FormattedApiError } from '@/features/fund-sources/api/format-api-error';
import type { UseFormReturn } from 'react-hook-form';

/** Validate -> confirm dialog -> post -> back to the list, mapping server errors onto rows. */
export function useSubmitEntries(
  form: UseFormReturn<LedgerEntriesFormValues>,
  periodUuid: string,
) {
  const { handleSubmit, setError, getValues } = form;
  const navigate = useNavigate();
  const { mutateAsync, isPending } = usePostLedgerEntries();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setApiError] = useState<FormattedApiError>();

  const goBack = () => navigate({ to: '/ledger-books' });

  const openConfirm = handleSubmit(() => {
    setApiError(undefined);
    setConfirmOpen(true);
  });

  const confirm = async () => {
    const { drafts, rowIndexes } = toDrafts(getValues('rows'));
    setApiError(undefined);
    try {
      await mutateAsync({
        periodUuid,
        fundSourceUuid: getValues('fundSourceUuid'),
        entries: drafts,
      });
      setConfirmOpen(false);
      await goBack();
    } catch (e) {
      setApiError(formatApiError(e, 'Không thể ghi bút toán.'));
      mapServerErrorsToRows(e, rowIndexes, setError);
    }
  };

  return {
    confirmOpen,
    setConfirmOpen,
    error,
    isPending,
    openConfirm,
    confirm,
    goBack,
  };
}
