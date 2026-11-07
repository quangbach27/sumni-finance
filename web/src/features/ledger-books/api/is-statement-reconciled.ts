import type { LedgerStatement } from './types';

/** A statement is reconciled once the real balance matches the closing balance. */
export const isStatementReconciled = (s: LedgerStatement) =>
  s.actualBalance !== undefined && s.actualBalance === s.closingBalance;
