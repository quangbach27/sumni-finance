import { createFileRoute } from '@tanstack/react-router';

import ContentLayout from '@/components/layout/content-layout/content-layout';

import InviteMemberDialog from '@/features/members/components/invite-member-dialog';
import MembersPage from '@/features/members/components/members-page';

export const Route = createFileRoute('/_app/settings_/roles')({
  staticData: { crumb: 'Vai trò và quyền' },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <ContentLayout
      title="Vai trò và quyền"
      description="Gán vai trò cho thành viên của sổ. Quyền ghi bút toán của Kế toán còn phụ thuộc nguồn quỹ được phân."
      additionalContent={<InviteMemberDialog />}
    >
      <MembersPage />
    </ContentLayout>
  );
}
