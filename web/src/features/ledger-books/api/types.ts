export type LedgerStatus = 'opened' | 'closed' | 'reconciled';

export type PageInfo = { page: number; pageSize: number; totalCount: number };

export type LedgerPeriod = {
  uuid: string;
  name: string;
  openingBalance: number;
  closingBalance?: number;
  /** ISO date-time. */
  openDate: string;
  /** ISO date-time. */
  closeDate: string;
  status: LedgerStatus;
  reopenReason?: string;
  reopenedAt?: string;
  reconciledAt?: string;
  reportUuid?: string;
};

/** The fund source a statement belongs to, with its live balance. */
export type LedgerStatementFundSource = {
  uuid: string;
  name: string;
  type: 'bank' | 'cash';
  balance: number;
  bankCode?: string;
  bankShortName?: string;
  ownerName: string;
  accountNumber?: string;
};

export type LedgerStatement = {
  uuid: string;
  openingBalance: number;
  closingBalance?: number;
  actualBalance?: number;
  fundSource: LedgerStatementFundSource;
  reconciledBy?: string;
  reconciledAt?: string;
};

export type LedgerPeriodDetail = LedgerPeriod & {
  totalInflow: number;
  totalOutflow: number;
  entryCount: number;
  statements: LedgerStatement[];
};

export type LedgerPeriodsPage = { items: LedgerPeriod[]; pageInfo: PageInfo };
