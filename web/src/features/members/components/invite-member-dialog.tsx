import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { PlusIcon } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';

import { ORG_ROLES, getRoleLabel } from '../api/roles';
import { useMyOrgRole } from '../api/use-is-admin';
import { useMemberAdmin } from '../api/use-member-admin';

const schema = z.object({
  email: z.string().trim().email('Email không hợp lệ'),
  role: z.enum(['office_admin', 'office_accountant', 'office_viewer']),
});

type FormValues = z.infer<typeof schema>;

/** Admin-only: other roles cannot invite, so nothing is rendered or loaded. */
export default function InviteMemberDialog() {
  const { isAdmin } = useMyOrgRole();
  return isAdmin ? <InviteMemberForm /> : null;
}

function InviteMemberForm() {
  const [open, setOpen] = useState(false);
  const { invite, busyId } = useMemberAdmin();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', role: 'office_viewer' },
  });

  const onSubmit = async (values: FormValues) => {
    const ok = await invite(values.email, values.role);
    if (ok) {
      setOpen(false);
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Mời thành viên
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <DialogHeader>
            <DialogTitle className="text-xl">Mời thành viên</DialogTitle>
            <DialogDescription>
              Lời mời được gửi qua email. Vai trò có hiệu lực khi họ chấp nhận.
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="invite-email">Email</FieldLabel>
                  <Input
                    {...field}
                    id="invite-email"
                    type="email"
                    placeholder="ten@congty.vn"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              name="role"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Vai trò</FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => v && field.onChange(v)}
                  >
                    <SelectTrigger>{getRoleLabel(field.value)}</SelectTrigger>
                    <SelectContent>
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
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={busyId === 'invite'}>
              Gửi lời mời
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
