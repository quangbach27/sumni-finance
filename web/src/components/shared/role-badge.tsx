import { Badge } from '@/components/ui/badge';

import { cn } from '@/lib/utils';

const roles: Partial<Record<string, { label: string; className: string }>> = {
  office_admin: {
    label: 'Quản trị',
    className:
      'border-violet-200 bg-violet-100 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-300',
  },
  office_accountant: {
    label: 'Kế toán',
    className:
      'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  office_viewer: {
    label: 'Người xem',
    className:
      'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-500/30 dark:bg-slate-500/15 dark:text-slate-300',
  },
};

const clerkOrgRolePrefix = 'org:';

export function RoleBadge({ role }: { role?: string }) {
  if (!role) return null;
  const config = roles[role.replace(clerkOrgRolePrefix, '')];
  if (!config) return null;

  return (
    <Badge
      variant="outline"
      className={cn(
        'h-4 shrink-0 px-1.5 text-[10px] font-medium',
        config.className,
      )}
    >
      {config.label}
    </Badge>
  );
}
