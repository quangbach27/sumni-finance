import { useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useLedgerPeriod } from '../api/get-ledger-period';
import {
  INITIAL_ROWS,
  createRows,
} from '../components/entries/post/post-journal-entries-model';
import { ledgerEntriesFormSchema } from '../components/entries/post/post-journal-entries-schema';
import { useAutosaveDraft, useEntriesDraft } from './use-entries-draft';

import type { LedgerEntriesFormValues } from '../components/entries/post/post-journal-entries-schema';

/** The period, its fund sources and the batch form (fund source + empty rows). */
export function usePostEntriesForm(periodUuid: string) {
  const period = useLedgerPeriod(periodUuid);

  const fundSources = useMemo(
    () => period.statements.map((s) => s.fundSource),
    [period.statements],
  );

  const initialFundSourceUuid = fundSources[0]?.uuid ?? '';
  const draft = useEntriesDraft();
  // Read once (sync) so a refresh doesn't flash empty rows.
  const [initialRows] = useState(() => {
    const saved = draft.getItem() ?? [];
    return [...saved, ...createRows(Math.max(0, INITIAL_ROWS - saved.length))];
  });

  const form = useForm<LedgerEntriesFormValues>({
    resolver: zodResolver(ledgerEntriesFormSchema),
    defaultValues: {
      fundSourceUuid: initialFundSourceUuid,
      rows: initialRows,
    },
    reValidateMode: 'onChange',
  });

  useAutosaveDraft(form, draft);

  return { period, fundSources, form, clearDraft: draft.removeItem };
}
