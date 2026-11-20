import { useEffect, useRef } from 'react';

import { useAuth } from '@clerk/react';
import { z } from 'zod';

import BrowserStorage from '@/lib/browser-storage';

import { entryRowObjectSchema } from '../components/entries/post/post-journal-entries-schema';

import type {
  LedgerEntriesFormValues,
  LedgerEntryRow,
} from '../components/entries/post/post-journal-entries-schema';
import type { UseFormReturn } from 'react-hook-form';

const SAVE_DELAY_MS = 1000;
const draftSchema = z.array(entryRowObjectSchema);

/** Browser storage holding the unposted rows, one draft per org. */
export function useEntriesDraft() {
  const { orgId } = useAuth();
  const storage = useRef(
    new BrowserStorage<LedgerEntryRow[]>(
      `sumni:ledger-entries-draft:v1:${orgId ?? 'personal'}`,
      {
        persist: true,
        // Throws on corrupt/outdated data; `getItem` then returns null.
        deserialize: (raw) => draftSchema.parse(JSON.parse(raw)),
      },
    ),
  );
  return storage.current;
}

/** Saves the rows to `draft` 1s after the user stops typing. */
export function useAutosaveDraft(
  form: UseFormReturn<LedgerEntriesFormValues>,
  draft: BrowserStorage<LedgerEntryRow[]>,
) {
  const { watch, getValues } = form;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = watch((_, { name }) => {
      if (!name?.startsWith('rows')) return;
      clearTimeout(timer);
      timer = setTimeout(() => draft.setItem(getValues('rows')), SAVE_DELAY_MS);
    });
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [watch, getValues, draft]);
}
