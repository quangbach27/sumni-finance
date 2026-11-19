import type { components } from '@/features/generated/ledgers.gen';

type Schemas = components['schemas'];

export type ListLedgerEntriesResponse = Schemas['ListLedgerEntriesResponse'];
export type GetLedgerEntryResponse = Schemas['GetLedgerEntryResponse'];
/** Decimals are normalized to numbers by the api functions. */
export type LedgerEntry = Schemas['LedgerEntryListItem'];
