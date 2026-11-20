import { useQuery } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { rolePoliciesQueryOptions } from '../api/role-policies';
import { getRoleLabel } from '../api/roles';

import type { RolePolicies } from '../api/role-policies';

const RESOURCES: { value: string; label: string }[] = [
  { value: 'fund_source', label: 'Nguồn quỹ' },
  { value: 'ledger_period', label: 'Kỳ sổ' },
  { value: 'ledger_entry', label: 'Bút toán' },
  { value: 'ledger_category', label: 'Danh mục và thẻ' },
  { value: 'access_grant', label: 'Phân quyền truy cập' },
];

const ACTION_LABELS: Record<string, string> = {
  read: 'Xem',
  create: 'Tạo',
  update: 'Sửa',
  delete: 'Xóa',
};

const actionsOf = (role: RolePolicies, resource: string) => [
  ...new Set(
    role.policies
      .flatMap((policy) => policy.rules)
      .filter((rule) => rule.resource === resource)
      .flatMap((rule) => rule.actions),
  ),
];

export default function RolePermissionsTab() {
  const query = useQuery(rolePoliciesQueryOptions());

  if (query.isPending) return <Skeleton className="mt-6 h-64 w-full" />;
  if (query.isError) {
    return (
      <p role="alert" className="text-destructive mt-6 text-sm">
        Không thể tải quyền của vai trò. Vui lòng thử lại.
      </p>
    );
  }

  const roles = query.data;

  return (
    <div className="mt-6 overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Quyền</TableHead>
            {roles.map((role) => (
              <TableHead key={role.role}>{getRoleLabel(role.role)}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {RESOURCES.map((resource) => (
            <TableRow key={resource.value}>
              <TableCell className="font-medium">{resource.label}</TableCell>
              {roles.map((role) => {
                const actions = actionsOf(role, resource.value);
                return (
                  <TableCell key={role.role}>
                    {actions.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {actions.map((action) => (
                          <Badge key={action} variant="secondary">
                            {ACTION_LABELS[action] ?? action}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <p className="text-muted-foreground border-t px-6 py-4 text-sm">
        Kế toán chỉ tạo, sửa và xóa được bút toán ở những nguồn quỹ được phân
        cho họ.
      </p>
    </div>
  );
}
