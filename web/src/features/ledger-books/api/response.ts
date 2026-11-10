import type { components } from '@/features/generated/ledgers.gen';

type Schemas = components['schemas'];

export type ListLedgerPeriodsResponse = Schemas['ListLedgerPeriodsResponse'];
export type GetLedgerPeriodResponse = Schemas['GetLedgerPeriodResponse'];
export type OpenLedgerPeriodResponse = Schemas['OpenLedgerPeriodResponse'];

export type LedgerPeriodResponse = ListLedgerPeriodsResponse['items'][number];
export type LedgerPeriodDetailResponse =
  GetLedgerPeriodResponse['ledger_period'];
export type LedgerStatementResponse =
  LedgerPeriodDetailResponse['statements'][number];

export type OpenLedgerPeriodRequest = Schemas['OpenLedgerPeriodRequest'];
export type ReopenLedgerPeriodRequest = Schemas['ReopenLedgerPeriodRequest'];
/** `actual_balance` is a Decimal string on the wire; a number serializes fine. */
export type ReconcileStatementsRequest = {
  statements: { statement_uuid: string; actual_balance: string | number }[];
};
