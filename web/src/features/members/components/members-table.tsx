import { useState } from 'react';

import { Trash2Icon } from 'lucide-react';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { getRoleLabel } from '../api/roles';
import { useMemberAdmin } from '../api/use-member-admin';
import FundSourcePicker from './fund-source-picker';
import RoleSelect from './role-select';
import WritableFundSources from './writable-fund-sources';

import type { Member, PendingInvitation } from '../api/use-member-admin';

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

type RemoveTarget =
  | { kind: 'member'; member: Member }
  | { kind: 'invitation'; invitation: PendingInvitation };

function Identity({
  name,
  email,
  imageUrl,
  isSelf,
}: {
  name: string;
  email: string;
  imageUrl?: string;
  isSelf?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="lg">
        <AvatarImage src={imageUrl} alt={name} />
        <AvatarFallback>{getInitials(name || email)}</AvatarFallback>
      </Avatar>
      <div className="flex min-w-0 flex-col">
        <span className="truncate font-medium">
          {name}
          {isSelf && (
            <span className="text-muted-foreground font-normal"> (bạn)</span>
          )}
        </span>
        <span className="text-muted-foreground truncate text-sm">{email}</span>
      </div>
    </div>
  );
}

export default function MembersTable() {
  const {
    members,
    pendingInvitations,
    isLoading,
    busyId,
    changeRole,
    removeMember,
    revokeInvitation,
    isAdmin,
  } = useMemberAdmin();
  const [target, setTarget] = useState<RemoveTarget | null>(null);

  if (isLoading) return <Skeleton className="mt-6 h-64 w-full" />;

  const confirmRemove = async () => {
    if (!target) return;
    if (target.kind === 'member') await removeMember(target.member);
    else await revokeInvitation(target.invitation);
    setTarget(null);
  };

  const targetName =
    target?.kind === 'member'
      ? target.member.name
      : (target?.invitation.email ?? '');

  return (
    <div className="mt-6 overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Thành viên</TableHead>
            <TableHead>Vai trò</TableHead>
            <TableHead>Nguồn quỹ ghi được</TableHead>
            <TableHead>Trạng thái</TableHead>
            {isAdmin && <TableHead className="w-16" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.userId}>
              <TableCell>
                <Identity {...member} />
              </TableCell>
              <TableCell>
                {isAdmin ? (
                  <RoleSelect
                    value={member.role}
                    memberName={member.name}
                    locked={member.isSelf}
                    disabled={busyId === member.userId}
                    onChange={(role) => changeRole(member, role)}
                  />
                ) : (
                  <span>{getRoleLabel(member.role)}</span>
                )}
              </TableCell>
              <TableCell>
                {isAdmin && member.role === 'office_accountant' ? (
                  <FundSourcePicker
                    userId={member.userId}
                    userName={member.name}
                  />
                ) : (
                  <WritableFundSources
                    userId={member.userId}
                    role={member.role}
                  />
                )}
              </TableCell>
              <TableCell>Đang hoạt động</TableCell>
              {isAdmin && (
                <TableCell>
                  {!member.isSelf && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive"
                      aria-label={`Xóa ${member.name}`}
                      disabled={busyId === member.userId}
                      onClick={() => setTarget({ kind: 'member', member })}
                    >
                      <Trash2Icon />
                    </Button>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
          {pendingInvitations.map((invitation) => (
            <TableRow key={invitation.id}>
              <TableCell>
                <Identity name={invitation.email} email="" />
              </TableCell>
              <TableCell>{getRoleLabel(invitation.role)}</TableCell>
              <TableCell>
                <span className="text-muted-foreground">—</span>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="border-dashed">
                  Chờ chấp nhận
                </Badge>
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="icon"
                  className="text-destructive"
                  aria-label={`Thu hồi lời mời ${invitation.email}`}
                  disabled={busyId === invitation.id}
                  onClick={() => setTarget({ kind: 'invitation', invitation })}
                >
                  <Trash2Icon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-muted-foreground border-t px-6 py-4 text-sm">
        Nguồn quỹ của Kế toán được gán trong{' '}
        <strong className="text-foreground">
          Nguồn quỹ › Phân quyền kế toán
        </strong>
        .{' '}
        {isAdmin
          ? 'Thay đổi vai trò có hiệu lực ngay.'
          : 'Chỉ Quản trị mới đổi được vai trò.'}
      </p>

      <AlertDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.kind === 'invitation'
                ? 'Thu hồi lời mời?'
                : 'Xóa thành viên?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.kind === 'invitation'
                ? `Lời mời gửi tới ${targetName} sẽ không còn hiệu lực.`
                : `${targetName} sẽ không còn truy cập được sổ này. Bút toán đã ghi vẫn được giữ.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <Button type="button" variant="destructive" onClick={confirmRemove}>
              {target?.kind === 'invitation' ? 'Thu hồi' : 'Xóa'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
