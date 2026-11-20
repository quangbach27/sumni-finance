import { LockIcon } from 'lucide-react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

import { ORG_ROLES, getRoleLabel } from '../api/roles';

import type { OrgRole } from '../api/roles';

type Props = {
  value: string;
  memberName: string;
  disabled?: boolean;
  /** Locked rows show a lock icon and cannot be changed. */
  locked?: boolean;
  onChange: (role: OrgRole) => void;
};

export default function RoleSelect({
  value,
  memberName,
  disabled,
  locked,
  onChange,
}: Props) {
  if (locked) {
    return (
      <div className="bg-muted text-muted-foreground flex h-9 w-44 items-center justify-between rounded-md border px-3 text-sm">
        {getRoleLabel(value)}
        <LockIcon className="size-4" />
      </div>
    );
  }

  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next && next !== value) onChange(next as OrgRole);
      }}
    >
      <SelectTrigger className="w-44" aria-label={`Vai trò của ${memberName}`}>
        {getRoleLabel(value)}
      </SelectTrigger>
      <SelectContent className="w-72">
        <p className="text-muted-foreground px-2 py-1.5 text-xs">
          Đổi vai trò của {memberName}
        </p>
        {ORG_ROLES.map((role) => (
          <SelectItem key={role.value} value={role.value}>
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{role.label}</span>
              <span className="text-muted-foreground text-xs">
                {role.description}
              </span>
            </span>
          </SelectItem>
        ))}
        <p className="text-muted-foreground border-t px-2 py-1.5 text-xs">
          Có hiệu lực ngay. Phải còn ít nhất 1 Quản trị.
        </p>
      </SelectContent>
    </Select>
  );
}
