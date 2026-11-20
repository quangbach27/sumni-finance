import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useMemberAdmin } from '../api/use-member-admin';
import MembersTable from './members-table';
import RolePermissionsTab from './role-permissions-tab';

/** Everyone in the org sees the members; only admins can change them. */
export default function MembersPage() {
  const { isLoading, members, pendingInvitations } = useMemberAdmin();

  if (isLoading) return <Skeleton className="mt-6 h-64 w-full" />;

  return (
    <Tabs defaultValue="members" className="mt-6">
      <TabsList variant="line">
        <TabsTrigger value="members">
          Thành viên{' '}
          <span className="text-muted-foreground">
            {members.length + pendingInvitations.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="roles">Quyền của vai trò</TabsTrigger>
      </TabsList>
      <TabsContent value="members">
        <MembersTable />
      </TabsContent>
      <TabsContent value="roles">
        <RolePermissionsTab />
      </TabsContent>
    </Tabs>
  );
}
