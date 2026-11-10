import { useMemo } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { useLedgerPeriod } from '../api/get-ledger-period';
import {
  INITIAL_ROWS,
  createRows,
} from '../components/entries/post/post-journal-entries-model';
import { ledgerEntriesFormSchema } from '../components/entries/post/post-journal-entries-schema';

import type { LedgerEntriesFormValues } from '../components/entries/post/post-journal-entries-schema';

/** The period, its fund sources and the batch form (fund source + empty rows). */
export function usePostEntriesForm(periodUuid: string) {
  const period = useLedgerPeriod(periodUuid);

  const fundSources = useMemo(
    () => period.statements.map((s) => s.fundSource),
    [period.statements],
  );

  const form = useForm<LedgerEntriesFormValues>({
    resolver: zodResolver(ledgerEntriesFormSchema),
    defaultValues: {
      fundSourceUuid: fundSources[0]?.uuid ?? '',
      rows: createRows(INITIAL_ROWS),
    },
    reValidateMode: 'onChange',
  });

  return { period, fundSources, form };
}
