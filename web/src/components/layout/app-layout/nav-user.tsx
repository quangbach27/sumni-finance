import { useClerk, useUser } from '@clerk/react';
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

function UserSummary({
  name,
  email,
  imageUrl,
}: {
  name: string;
  email: string;
  imageUrl?: string;
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
        <span className="truncate font-medium">{name}</span>
        <span className="text-muted-foreground group-hover/footer:text-muted truncate text-xs">
          {email}
        </span>
      </div>
    </>
  );
}

export default function NavUser() {
  const { user } = useUser();
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
            <UserSummary name={name} email={email} imageUrl={user.imageUrl} />
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
