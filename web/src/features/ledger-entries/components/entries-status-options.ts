import type { LedgerEntriesStatus } from '@/features/ledger-entries/api/list-ledger-entries';

export const ENTRY_STATUS_OPTIONS: {
  value: LedgerEntriesStatus;
  label: string;
}[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'posted', label: 'Đã ghi sổ' },
  { value: 'voided', label: 'Đã hủy' },
];
