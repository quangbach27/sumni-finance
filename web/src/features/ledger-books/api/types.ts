import type { components } from '@/features/generated/ledgers.gen';

type Schemas = components['schemas'];

/** Decimal fields are normalized to numbers by `getLedgerPeriods`. */
export type LedgerPeriod = Omit<
  Schemas['LedgerPeriod'],
  'opening_balance' | 'closing_balance'
> & {
  opening_balance: number;
  closing_balance?: number;
};
export type LedgerStatus = Schemas['LedgerStatus'];
export type ListLedgerPeriodsResponse = Schemas['ListLedgerPeriodsResponse'];
export type OpenLedgerPeriodRequest = Schemas['OpenLedgerPeriodRequest'];
export type OpenLedgerPeriodResponse = Schemas['OpenLedgerPeriodResponse'];
