import { useClerk, useOrganization, useUser } from '@clerk/react';
import { ChevronsUpDownIcon, LogOutIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

import { RoleBadge } from '@/components/shared/role-badge';

function UserSummary({
  name,
  email,
  imageUrl,
  role,
}: {
  name: string;
  email: string;
  imageUrl?: string;
  role?: string;
}) {
  return (
    <>
      <Avatar className="size-8 rounded-lg">
        <AvatarImage src={imageUrl} alt={name} />
        <AvatarFallback className="rounded-lg">
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{name}</span>
          <RoleBadge role={role} />
        </div>
        <span className="text-muted-foreground group-hover/footer:text-muted truncate text-xs">
          {email}
        </span>
      </div>
    </>
  );
}

export default function NavUser() {
  const { user } = useUser();
  const { membership } = useOrganization();
  const role = membership?.role;
  const { signOut } = useClerk();
  const { isMobile } = useSidebar();

  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress ?? '';
  const name = user.fullName ?? email;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="group/footer" />}
          >
            <UserSummary
              name={name}
              email={email}
              imageUrl={user.imageUrl}
              role={role}
            />
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex items-center gap-2 px-1 py-1.5">
                <UserSummary
                  name={name}
                  email={email}
                  imageUrl={user.imageUrl}
                  role={role}
                />
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut({ redirectUrl: '/' })}>
              <LogOutIcon />
              Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
