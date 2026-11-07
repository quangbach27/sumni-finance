import { formatAmount } from '@/lib/currency';

import { getFundSourceLabel } from '../shared/fund-source-label';

import type {
  LedgerStatement,
  LedgerStatementFundSource,
} from '../../api/types';

export const CURRENCY = 'VND';

export type RowStatus = 'reconciled' | 'match' | 'mismatch' | 'empty';

export type StatementRow = {
  statement: LedgerStatement;
  name: string;
  kind: string;
  closingBalance: number;
  movement: number;
  /** Text typed by the user (digits only) or undefined when untouched. */
  typedBalance?: string;
  actualBalance?: number;
  difference?: number;
  status: RowStatus;
  /** True while the user is still typing (check is debounced). */
  isTyping?: boolean;
  error?: string;
};

/** Props shared by every list that renders statement rows. */
export type StatementListProps = {
  rows: StatementRow[];
  /** Disables all inputs and actions. */
  disabled?: boolean;
  confirmingStatementUuid?: string;
  onActualBalanceChange: (statementUuid: string, text: string) => void;
  onConfirm: (statementUuid: string) => void;
};

export const signed = (n: number) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatAmount(Math.abs(n), CURRENCY)}`;

export const rowLabels = (fundSource: LedgerStatementFundSource) => ({
  name: getFundSourceLabel(fundSource),
  kind: fundSource.type === 'cash' ? 'Tiền mặt' : 'Ngân hàng',
});

export const mismatchMessage = (r: StatementRow) =>
  r.status === 'mismatch' && r.difference !== undefined
    ? `${r.name} lệch ${formatAmount(Math.abs(r.difference), CURRENCY)}. Số dư hệ thống ${formatAmount(r.closingBalance, CURRENCY)}, số đếm thực tế ${formatAmount(r.actualBalance ?? 0, CURRENCY)}. Kiểm tra lại các bút toán hoặc ghi bút toán điều chỉnh.`
    : undefined;
