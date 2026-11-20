import { List, QrCode, Trash2, Users } from 'lucide-react';

import type { FundSource } from '../../api/types';
import type { LazyTriggerProps } from '@/components/shared/lazy-trigger/lazy-trigger';
import type { useNavigate } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';

export type FundSourceAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  variant?: 'default' | 'destructive';
  /** Hides the action for this fund source. */
  hidden?: boolean;
  /** Disables the action; a string is shown as a hint under the label. */
  disabledReason?: string | true;
  /** Runs when selected. Without it the action is disabled (not built yet). */
  onSelect?: () => void;
  /** Prefetch / aria props when `onSelect` opens a LazyDialogTrigger dialog. */
  triggerProps?: Omit<LazyTriggerProps, 'onClick'>;
};

type Args = {
  item: FundSource;
  navigate: ReturnType<typeof useNavigate>;
  /** Handed out by the LazyDialogTrigger wrapping the menu. */
  vietQr: LazyTriggerProps;
  accountants: LazyTriggerProps;
};

/** Groups are rendered in order, separated by a divider. */
export const getFundSourceActionGroups = ({
  item,
  navigate,
  vietQr,
  accountants,
}: Args): FundSourceAction[][] => [
  [
    {
      id: 'entries',
      label: 'Xem bút toán',
      icon: List,
      onSelect: () =>
        void navigate({
          to: '/fund-sources/$uuid',
          params: { uuid: item.uuid },
          search: {
            range: 1,
            page: 1,
            status: 'posted',
          },
        }),
    },
    {
      id: 'vietqr',
      label: 'Tạo mã VietQR',
      icon: QrCode,
      hidden: item.type !== 'bank',
      onSelect: vietQr.onClick,
      triggerProps: vietQr,
    },
    {
      id: 'accountants',
      label: 'Phân quyền kế toán',
      icon: Users,
      onSelect: accountants.onClick,
      triggerProps: accountants,
    },
  ],
  [
    {
      id: 'delete',
      label: 'Xóa nguồn quỹ',
      icon: Trash2,
      variant: 'destructive',
      disabledReason: 'Đã có bút toán, không thể xóa',
    },
  ],
];
