import type {
  LedgerPeriodDetailResponse,
  LedgerPeriodReportResponse,
  LedgerPeriodResponse,
  LedgerStatementResponse,
  ListLedgerPeriodsResponse,
} from './response';
import type {
  LedgerPeriod,
  LedgerPeriodDetail,
  LedgerPeriodReport,
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

export const toLedgerPeriodReport = (
  r: LedgerPeriodReportResponse,
): LedgerPeriodReport => ({
  uuid: r.uuid,
  periodUuid: r.period_uuid,
  startBalance: toNumber(r.ledger.start_balance),
  closeBalance: toNumber(r.ledger.close_balance),
  totalInflow: toNumber(r.ledger.total_inflow),
  totalOutflow: toNumber(r.ledger.total_outflow),
  fundSources: r.fund_sources.map((f) => ({
    fundSourceUuid: f.fund_source_uuid,
    name: f.name,
    startBalance: toNumber(f.start_balance),
    closeBalance: toNumber(f.close_balance),
    totalInflow: toNumber(f.total_inflow),
    totalOutflow: toNumber(f.total_outflow),
    isReconciled: f.reconcile_status === 'reconciled',
  })),
  categories: r.categories.map((c) => ({
    categoryUuid: c.category_uuid,
    name: c.name,
    totalInflow: toNumber(c.total_inflow),
    totalOutflow: toNumber(c.total_outflow),
    difference: toNumber(c.total_inflow) - toNumber(c.total_outflow),
    percentage: toNumber(c.percentage),
    tags: c.tags.map((t) => ({
      tagUuid: t.tag_uuid,
      name: t.name,
      totalInflow: toNumber(t.total_inflow),
      totalOutflow: toNumber(t.total_outflow),
      difference: toNumber(t.difference),
    })),
  })),
});
