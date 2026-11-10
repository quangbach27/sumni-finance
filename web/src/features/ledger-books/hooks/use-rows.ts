import { useCallback } from 'react';

import { useFormContext, useWatch } from 'react-hook-form';

import { normalizeRows } from '../components/entries/post/post-journal-entries-model';

import type {
  LedgerEntriesFormValues,
  LedgerEntryRow,
} from '../components/entries/post/post-journal-entries-schema';

/**
 * The batch rows as a controlled value for the grid. The grid emits the whole
 * array on every edit, so this sets `rows` directly (no `useFieldArray`).
 */
export function useRows() {
  const { control, setValue, getValues, formState } =
    useFormContext<LedgerEntriesFormValues>();
  const rows = useWatch({ control, name: 'rows' });
  const { isSubmitted } = formState;

  const setRows = useCallback(
    (next: LedgerEntryRow[]) =>
      setValue('rows', normalizeRows(next, getValues('rows')), {
        shouldDirty: true,
        shouldValidate: isSubmitted,
      }),
    [setValue, getValues, isSubmitted],
  );

  return { rows, setRows, rowErrors: formState.errors.rows };
}
