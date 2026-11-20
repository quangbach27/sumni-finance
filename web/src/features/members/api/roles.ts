export type OrgRole = 'office_admin' | 'office_accountant' | 'office_viewer';

export const ORG_ROLES: {
  value: OrgRole;
  label: string;
  description: string;
}[] = [
  {
    value: 'office_admin',
    label: 'Quản trị',
    description: 'Toàn quyền: quản lý sổ, thành viên và mọi nguồn quỹ',
  },
  {
    value: 'office_accountant',
    label: 'Kế toán',
    description: 'Ghi bút toán và đối soát ở nguồn quỹ được phân',
  },
  {
    value: 'office_viewer',
    label: 'Người xem',
    description: 'Chỉ xem, không sửa được gì',
  },
];

export const getRoleLabel = (role: string) =>
  ORG_ROLES.find((r) => r.value === role)?.label ?? role;

/** Clerk stores roles with an `org:` prefix. */
export const toClerkRole = (role: OrgRole) => `org:${role}`;
