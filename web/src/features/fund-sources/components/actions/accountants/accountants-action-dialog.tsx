import { useMemo, useState } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Plus, Search, X } from 'lucide-react';

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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FieldDescription } from '@/components/ui/field';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from '@/components/ui/input-group';
import { Skeleton } from '@/components/ui/skeleton';

import { isApiError } from '@/lib/clients';

import {
  accountantGrantsQueryOptions,
  useGrantAccountants,
  useRevokeAccountant,
} from '../../../api/access-grants';
import { useOrgMembers } from '../../../api/use-org-members';

import type { AccessGrant } from '../../../api/access-grants';
import type { OrgMember } from '../../../api/use-org-members';
import type { FundSourceActionDialogProps } from '../types';
import type { ReactNode } from 'react';

const getInitials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();

const MemberAvatar = ({ member }: { member: OrgMember }) => (
  <Avatar size="lg">
    <AvatarImage src={member.imageUrl} alt={member.name} />
    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
  </Avatar>
);

const AccountantRow = ({
  member,
  action,
}: {
  member: OrgMember;
  action: ReactNode;
}) => (
  <div className="flex items-center gap-3 border-b py-3 last:border-b-0">
    <MemberAvatar member={member} />
    <div className="flex min-w-0 flex-1 flex-col">
      <span className="truncate font-medium">{member.name}</span>
      <span className="text-muted-foreground truncate text-sm">
        {member.email}
      </span>
    </div>
    {action}
  </div>
);

type ContentProps = FundSourceActionDialogProps & {
  grants: AccessGrant[];
};

const AccountantsContent = ({ fundSource, grants, onClose }: ContentProps) => {
  const { members, isLoading: membersLoading } = useOrgMembers();
  const grant = useGrantAccountants();
  const revoke = useRevokeAccountant();

  // Members picked in this dialog but not saved yet.
  const [pendingUserIds, setPendingUserIds] = useState<string[]>([]);
  const [revokeTarget, setRevokeTarget] = useState<AccessGrant | null>(null);
  const [search, setSearch] = useState('');

  const userIds = useMemo(
    () => [...grants.map((g) => g.user_id), ...pendingUserIds],
    [grants, pendingUserIds],
  );

  const memberById = useMemo(
    () => new Map(members.map((member) => [member.userId, member])),
    [members],
  );

  // Members first matching the fund source owner name, then the rest.
  const suggestions = useMemo(() => {
    const query = normalize(search.trim());
    const owner = normalize(fundSource.details.owner_name);
    const score = (member: OrgMember) =>
      owner && normalize(member.name).includes(owner) ? 0 : 1;

    return members
      .filter((member) => !userIds.includes(member.userId))
      .filter(
        (member) =>
          !query ||
          normalize(member.name).includes(query) ||
          normalize(member.email).includes(query),
      )
      .sort((a, b) => score(a) - score(b));
  }, [members, userIds, search, fundSource.details.owner_name]);

  const getMember = (userId: string): OrgMember =>
    memberById.get(userId) ?? {
      userId,
      name: userId,
      email: '',
      imageUrl: '',
    };

  const submit = () =>
    grant.mutate(
      { fundSourceUuid: fundSource.uuid, userIds: pendingUserIds },
      { onSuccess: onClose },
    );

  const confirmRevoke = () => {
    if (!revokeTarget) return;
    revoke.mutate(
      { fundSourceUuid: fundSource.uuid, grantUuid: revokeTarget.uuid },
      { onSuccess: () => setRevokeTarget(null) },
    );
  };

  const errorText = (error: unknown, fallback: string) =>
    isApiError(error) && error.isForbidden
      ? 'Bạn không có quyền phân quyền kế toán.'
      : fallback;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-xl">Phân quyền kế toán</DialogTitle>
        <DialogDescription>{fundSource.name}</DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Kế toán hiện tại</span>
            <span className="text-muted-foreground">
              {grants.length + pendingUserIds.length} người
            </span>
          </div>
          {userIds.length === 0 && (
            <span className="text-muted-foreground py-3 text-sm">
              Chưa có kế toán nào.
            </span>
          )}
          {grants.map((g) => (
            <AccountantRow
              key={g.uuid}
              member={getMember(g.user_id)}
              action={
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setRevokeTarget(g)}
                >
                  Thu hồi
                </Button>
              }
            />
          ))}
          {pendingUserIds.map((userId) => (
            <AccountantRow
              key={userId}
              member={getMember(userId)}
              action={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Bỏ chọn"
                  onClick={() =>
                    setPendingUserIds((ids) =>
                      ids.filter((id) => id !== userId),
                    )
                  }
                >
                  <X />
                </Button>
              }
            />
          ))}
        </div>

        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            placeholder="Thêm thành viên theo tên hoặc email…"
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>

        <div className="flex flex-col">
          <span className="text-muted-foreground mb-1 text-sm">
            Gợi ý từ thành viên sổ cái
          </span>
          {membersLoading && <Skeleton className="h-14 w-full" />}
          {!membersLoading && suggestions.length === 0 && (
            <span className="text-muted-foreground py-3 text-sm">
              Không có thành viên phù hợp.
            </span>
          )}
          {suggestions.map((member) => (
            <div
              key={member.userId}
              className="flex items-center gap-3 border-b py-3 last:border-b-0"
            >
              <MemberAvatar member={member} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{member.name}</span>
                <span className="text-muted-foreground truncate text-sm">
                  {member.email}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setPendingUserIds((ids) => [...ids, member.userId])
                }
              >
                <Plus data-icon="inline-start" />
                Thêm
              </Button>
            </div>
          ))}
        </div>

        <FieldDescription>
          Kế toán được ghi, sửa và hủy bút toán của quỹ này. Gỡ kế toán không
          xóa bút toán đã ghi. Thay đổi có hiệu lực ngay khi lưu.
        </FieldDescription>

        {grant.isError && (
          <p role="alert" className="text-destructive text-sm">
            {errorText(
              grant.error,
              'Không thể lưu phân quyền. Vui lòng thử lại.',
            )}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Hủy
        </Button>
        <Button
          type="button"
          disabled={grant.isPending || pendingUserIds.length === 0}
          onClick={submit}
        >
          Lưu phân quyền
        </Button>
      </DialogFooter>

      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null);
            revoke.reset();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Thu hồi quyền kế toán?</AlertDialogTitle>
            <AlertDialogDescription>
              {revokeTarget ? getMember(revokeTarget.user_id).name : ''} sẽ
              không còn ghi, sửa hoặc hủy bút toán của quỹ này. Bút toán đã ghi
              vẫn được giữ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {revoke.isError && (
            <p role="alert" className="text-destructive text-sm">
              {errorText(revoke.error, 'Không thể thu hồi. Vui lòng thử lại.')}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={revoke.isPending}
              onClick={confirmRevoke}
            >
              Thu hồi
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const AccountantsLoader = (props: FundSourceActionDialogProps) => {
  const query = useQuery(accountantGrantsQueryOptions(props.fundSource.uuid));

  if (query.isPending) return <Skeleton className="h-48 w-full" />;

  if (query.isError) {
    const { error } = query;
    return (
      <>
        <DialogHeader>
          <DialogTitle className="text-xl">Phân quyền kế toán</DialogTitle>
        </DialogHeader>
        <p role="alert" className="text-destructive text-sm">
          {isApiError(error) && error.isForbidden
            ? 'Bạn không có quyền phân quyền kế toán.'
            : 'Không thể tải phân quyền. Vui lòng thử lại.'}
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={props.onClose}>
            Đóng
          </Button>
        </DialogFooter>
      </>
    );
  }

  return <AccountantsContent {...props} grants={query.data} />;
};

export default function AccountantsActionDialog(
  props: FundSourceActionDialogProps,
) {
  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent className="sm:max-w-lg">
        <AccountantsLoader {...props} />
      </DialogContent>
    </Dialog>
  );
}
