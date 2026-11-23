import { useState } from 'react';

import { XIcon } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import RowActionsMenu from '@/components/shared/row-actions/row-actions-menu';

import { getRoleLabel } from '../api/roles';
import { useMemberAdmin } from '../api/use-member-admin';

import type { Invitation, InvitationStatus } from '../api/use-member-admin';

export const STATUS_LABELS: Record<InvitationStatus, string> = {
  pending: 'Chờ chấp nhận',
  accepted: 'Đã chấp nhận',
  revoked: 'Đã thu hồi',
  expired: 'Đã hết hạn',
};

type StatusFilter = InvitationStatus | 'all';

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium' }).format(date);

const STATUS_CLASS_NAMES: Record<InvitationStatus, string> = {
  pending:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  accepted:
    'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300',
  revoked:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
  expired: 'border-border bg-muted text-muted-foreground',
};

function StatusBadge({ status }: { status: InvitationStatus }) {
  return (
    <Badge variant="outline" className={STATUS_CLASS_NAMES[status]}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export default function InvitationsTable() {
  const { invitations, isLoading, revokeInvitation } = useMemberAdmin();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [target, setTarget] = useState<Invitation | null>(null);

  if (isLoading) return <Skeleton className="mt-6 h-64 w-full" />;

  const confirmRevoke = async () => {
    if (!target) return;
    await revokeInvitation(target);
    setTarget(null);
  };

  const visible =
    status === 'all'
      ? invitations
      : invitations.filter((i) => i.status === status);

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div>
        <Select
          value={status}
          onValueChange={(value) => {
            if (value) setStatus(value);
          }}
        >
          <SelectTrigger>
            Trạng thái: {status === 'all' ? 'Tất cả' : STATUS_LABELS[status]}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả</SelectItem>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Vai trò</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Ngày mời</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-muted-foreground py-8 text-center"
                >
                  {invitations.length === 0
                    ? 'Chưa có lời mời nào.'
                    : 'Không có lời mời nào ở trạng thái này.'}
                </TableCell>
              </TableRow>
            )}
            {visible.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium">
                  {invitation.email}
                </TableCell>
                <TableCell>{getRoleLabel(invitation.role)}</TableCell>
                <TableCell>
                  <StatusBadge status={invitation.status} />
                </TableCell>
                <TableCell>{formatDate(invitation.createdAt)}</TableCell>
                <TableCell>
                  {invitation.status === 'pending' && (
                    <RowActionsMenu
                      actions={[
                        {
                          key: 'revoke',
                          label: 'Thu hồi lời mời',
                          icon: XIcon,
                          destructive: true,
                          onSelect: () => setTarget(invitation),
                        },
                      ]}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thu hồi lời mời?</AlertDialogTitle>
            <AlertDialogDescription>
              {`Lời mời gửi tới ${target?.email ?? ''} sẽ không còn hiệu lực.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={confirmRevoke}>
              Thu hồi
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
