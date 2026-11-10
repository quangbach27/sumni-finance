import type {
  LedgerPeriodDetailResponse,
  LedgerPeriodResponse,
  LedgerStatementResponse,
  ListLedgerPeriodsResponse,
} from './response';
import type {
  LedgerPeriod,
  LedgerPeriodDetail,
  LedgerPeriodsPage,
  LedgerStatement,
} from './types';

const toNumber = (v: string | number) => Number(v);
const toOptionalNumber = (v?: string | number) =>
  v === undefined ? undefined : Number(v);

export const toLedgerPeriod = (p: LedgerPeriodResponse): LedgerPeriod => ({
  uuid: p.uuid,
  name: p.name,
  openingBalance: toNumber(p.opening_balance),
  closingBalance: toOptionalNumber(p.closing_balance),
  openDate: p.open_date,
  closeDate: p.close_date,
  // Assignment fails to compile if the spec's status enum drifts.
  status: p.status,
  reopenReason: p.reopen_reason,
  reopenedAt: p.reopened_at,
  reconciledAt: p.reconciled_at,
  reportUuid: p.report_uuid,
});

export const toLedgerStatement = (
  s: LedgerStatementResponse,
): LedgerStatement => ({
  uuid: s.uuid,
  openingBalance: toNumber(s.opening_balance),
  closingBalance: toOptionalNumber(s.closing_balance),
  actualBalance: toOptionalNumber(s.actual_balance),
  fundSource: {
    uuid: s.fund_source.uuid,
    name: s.fund_source.name,
    type: s.fund_source.type,
    balance: toNumber(s.fund_source.balance),
    bankCode: s.fund_source.details.bank_code,
    bankShortName: s.fund_source.details.bank_short_name,
    ownerName: s.fund_source.details.owner_name,
    accountNumber: s.fund_source.details.account_number,
  },
  reconciledBy: s.reconciled_by,
  reconciledAt: s.reconciled_at,
});

export const toLedgerPeriodDetail = (
  p: LedgerPeriodDetailResponse,
): LedgerPeriodDetail => ({
  ...toLedgerPeriod(p),
  totalInflow: toNumber(p.total_inflow),
  totalOutflow: toNumber(p.total_outflow),
  entryCount: p.entry_count,
  statements: p.statements.map(toLedgerStatement),
  categorySummaries: p.category_summaries.map((c) => ({
    categoryUuid: c.category_uuid,
    entryCount: c.entry_count,
    totalInflow: toNumber(c.total_inflow),
    totalOutflow: toNumber(c.total_outflow),
  })),
});

export const toLedgerPeriodsPage = (
  r: ListLedgerPeriodsResponse,
): LedgerPeriodsPage => ({
  items: r.items.map(toLedgerPeriod),
  pageInfo: {
    page: r.page_info.page,
    pageSize: r.page_info.page_size,
    totalCount: r.page_info.total_count,
  },
});
