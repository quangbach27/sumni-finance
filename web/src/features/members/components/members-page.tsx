import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useMemberAdmin } from '../api/use-member-admin';
import { useMembersSearch } from '../api/use-members-search';
import InvitationsTable from './invitations-table';
import MembersTable from './members-table';
import RolePermissionsTab from './role-permissions-tab';

/** Everyone in the org sees the members; only admins can change them. */
export default function MembersPage() {
  const { isLoading, isAdmin, members, pendingInvitations, invitations } =
    useMemberAdmin();
  const { search, updateSearch } = useMembersSearch();
  // Only admins can see invitations, so a shared link falls back to members.
  const tab = search.tab === 'invitations' && !isAdmin ? 'members' : search.tab;

  if (isLoading) return <Skeleton className="mt-6 h-64 w-full" />;

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => updateSearch({ tab: value as typeof tab })}
      className="mt-6"
    >
      <TabsList variant="line">
        <TabsTrigger value="members">
          Thành viên{' '}
          <span className="text-muted-foreground">
            {members.length + pendingInvitations.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="roles">Quyền của vai trò</TabsTrigger>
        {isAdmin && (
          <TabsTrigger value="invitations">
            Lời mời{' '}
            <span className="text-muted-foreground">{invitations.length}</span>
          </TabsTrigger>
        )}
      </TabsList>
      <TabsContent value="members">
        <MembersTable />
      </TabsContent>
      <TabsContent value="roles">
        <RolePermissionsTab />
      </TabsContent>
      {isAdmin && (
        <TabsContent value="invitations">
          <InvitationsTable />
        </TabsContent>
      )}
    </Tabs>
  );
}
