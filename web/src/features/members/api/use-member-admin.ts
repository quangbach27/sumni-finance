import { useEffect, useState } from 'react';

import { useOrganization, useUser } from '@clerk/react';
import { isClerkAPIResponseError } from '@clerk/react/errors';

import { toast } from '@/components/ui/toast';

import { orgRoleName } from '@/hooks/use-org-members';

import { getRoleLabel, toClerkRole } from './roles';
import { useMyOrgRole } from './use-is-admin';

import type { OrgRole } from './roles';

export type Member = {
  userId: string;
  name: string;
  email: string;
  imageUrl: string;
  role: string;
  isSelf: boolean;
};

export type PendingInvitation = {
  id: string;
  email: string;
  role: string;
};

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export type Invitation = PendingInvitation & {
  status: InvitationStatus;
  createdAt: Date;
};

const errorMessage = (error: unknown, fallback: string) =>
  isClerkAPIResponseError(error)
    ? (error.errors[0]?.longMessage ?? fallback)
    : fallback;

/** Loads every page of a Clerk paginated resource. */
const useLoadAll = (
  resource:
    | { hasNextPage: boolean; isFetching: boolean; fetchNext?: () => unknown }
    | null
    | undefined,
) => {
  const hasMore = Boolean(resource?.hasNextPage);
  const isFetching = Boolean(resource?.isFetching);
  const fetchNext = resource?.fetchNext;
  useEffect(() => {
    if (hasMore && !isFetching) fetchNext?.();
  }, [hasMore, isFetching, fetchNext]);
};

/**
 * Members and pending invitations of the active organization, with actions
 * that apply immediately and report the result as a toast.
 */
export const useMemberAdmin = () => {
  const { user } = useUser();
  const { isAdmin } = useMyOrgRole();
  const { organization, memberships, invitations, isLoaded } = useOrganization({
    memberships: { infinite: true, keepPreviousData: true, pageSize: 100 },
    // Pending invitations are only visible to admins.
    invitations: isAdmin
      ? {
          infinite: true,
          keepPreviousData: true,
          pageSize: 100,
          status: ['pending', 'accepted', 'revoked', 'expired'],
        }
      : undefined,
  });
  const [busyId, setBusyId] = useState<string | null>(null);

  useLoadAll(memberships);
  useLoadAll(invitations);

  const members: Member[] = (memberships?.data ?? []).flatMap((m) => {
    const { userId, firstName, lastName, identifier, imageUrl } =
      m.publicUserData ?? {};
    if (!userId) return [];
    const name = [firstName, lastName].filter(Boolean).join(' ');
    return [
      {
        userId,
        name: name || identifier || userId,
        email: identifier ?? '',
        imageUrl: imageUrl ?? '',
        role: orgRoleName(m.role),
        isSelf: userId === user?.id,
      },
    ];
  });

  const allInvitations: Invitation[] = (invitations?.data ?? [])
    .map((i) => ({
      id: i.id,
      email: i.emailAddress,
      role: orgRoleName(i.role),
      status: i.status,
      createdAt: i.createdAt,
    }))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const pendingInvitations = allInvitations.filter(
    (i) => i.status === 'pending',
  );

  const run = async (
    id: string,
    action: () => Promise<unknown>,
    successTitle: string,
    failureTitle: string,
  ) => {
    setBusyId(id);
    try {
      await action();
      await Promise.all([
        memberships?.revalidate?.(),
        invitations?.revalidate?.(),
      ]);
      toast.add({ type: 'success', title: successTitle });
      return true;
    } catch (error) {
      toast.add({
        type: 'error',
        title: failureTitle,
        description: errorMessage(error, 'Vui lòng thử lại.'),
      });
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const changeRole = (member: Member, role: OrgRole) => {
    const target = memberships?.data?.find(
      (m) => m.publicUserData?.userId === member.userId,
    );
    if (!target) return Promise.resolve(false);
    return run(
      member.userId,
      () => target.update({ role: toClerkRole(role) }),
      `Đã đổi vai trò của ${member.name} thành ${getRoleLabel(role)}.`,
      'Không thể đổi vai trò.',
    );
  };

  const removeMember = (member: Member) => {
    const target = memberships?.data?.find(
      (m) => m.publicUserData?.userId === member.userId,
    );
    if (!target) return Promise.resolve(false);
    return run(
      member.userId,
      () => target.destroy(),
      `Đã xóa ${member.name} khỏi sổ.`,
      'Không thể xóa thành viên.',
    );
  };

  const revokeInvitation = (invitation: PendingInvitation) => {
    const target = invitations?.data?.find((i) => i.id === invitation.id);
    if (!target) return Promise.resolve(false);
    return run(
      invitation.id,
      () => target.revoke(),
      `Đã thu hồi lời mời ${invitation.email}.`,
      'Không thể thu hồi lời mời.',
    );
  };

  const invite = (email: string, role: OrgRole) =>
    run(
      'invite',
      () =>
        organization!.inviteMember({
          emailAddress: email,
          role: toClerkRole(role),
        }),
      `Đã gửi lời mời tới ${email}.`,
      'Không thể gửi lời mời.',
    );

  return {
    members,
    pendingInvitations,
    invitations: allInvitations,
    isLoading:
      !isLoaded || Boolean(memberships?.isLoading || invitations?.isLoading),
    isAdmin,
    busyId,
    changeRole,
    removeMember,
    revokeInvitation,
    invite,
  };
};
