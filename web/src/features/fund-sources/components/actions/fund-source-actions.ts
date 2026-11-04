import { lazy } from 'react';

import { Copy, List, Pencil, QrCode, Trash2 } from 'lucide-react';

import type { FundSourceAction, FundSourceActionGroup } from './types';

const loadVietQrDialog = () => import('./vietqr/vietqr-action-dialog');

const isBank: FundSourceAction['isVisible'] = (item) => item.type === 'bank';

// To add an action: add an entry here (plus its dialog file if it needs one).
// Entries without `Dialog` / `onSelect` are rendered disabled (not built yet).
export const FUND_SOURCE_ACTION_GROUPS: FundSourceActionGroup[] = [
  [
    { id: 'edit', label: 'Sửa', icon: Pencil, getDisabledReason: () => true },
    {
      id: 'copy-account',
      label: 'Sao chép số tài khoản',
      icon: Copy,
      isVisible: isBank,
      getDisabledReason: () => true,
    },
    {
      id: 'vietqr',
      label: 'Tạo mã VietQR',
      icon: QrCode,
      isVisible: isBank,
      Dialog: lazy(loadVietQrDialog),
    },
    {
      id: 'entries',
      label: 'Xem bút toán',
      icon: List,
      getDisabledReason: () => true,
    },
  ],
  [
    {
      id: 'delete',
      label: 'Xóa nguồn quỹ',
      icon: Trash2,
      variant: 'destructive',
      getDisabledReason: () => 'Đã có bút toán, không thể xóa',
    },
  ],
];
