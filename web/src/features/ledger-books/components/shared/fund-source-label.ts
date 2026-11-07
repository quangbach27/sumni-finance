import type { LedgerStatementFundSource } from '../../api/types';

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

/** Short label of a fund source: bank code, or "Tiền mặt" for cash. */
export const getFundSourceLabel = (fs: LedgerStatementFundSource) =>
  fs.bankCode ?? (fs.type === 'cash' ? 'Tiền mặt' : fs.name);

/** Title of a fund source row: bank short name, or "Tiền mặt" for cash. */
export const getFundSourceTitle = (fs: LedgerStatementFundSource) =>
  fs.type === 'cash'
    ? 'Tiền mặt'
    : (fs.bankShortName ?? fs.bankCode ?? fs.name);

/** Subtitle: owner name, plus the masked account number for banks. */
export const getFundSourceSubtitle = (fs: LedgerStatementFundSource) =>
  [
    fs.ownerName,
    fs.type === 'bank' && fs.accountNumber
      ? `••${fs.accountNumber.slice(-4)}`
      : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
