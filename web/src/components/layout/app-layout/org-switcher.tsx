import { CheckIcon, ChevronsUpDownIcon } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

import { useSwitchOrg } from '@/hooks/use-switch-org';
import { cn } from '@/lib/utils';

import OrgSwitchOverlay from './org-switch/org-switch-overlay';

function OrgLogo({
  name,
  imageUrl,
  className,
}: {
  name: string;
  imageUrl?: string;
  className?: string;
}) {
  return (
    <Avatar className={cn('rounded-xl', className)}>
      <AvatarImage src={imageUrl} alt={name} />
      <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}

export default function OrgSwitcher() {
  const { activeOrg, orgs, isSwitching, handleSwitchOrg } = useSwitchOrg();
  const { isMobile } = useSidebar();

  const orgName = activeOrg?.name ?? 'Chọn tổ chức';

  const handleSelect = (organizationId: string) => {
    void handleSwitchOrg(organizationId);
  };

  return (
    <SidebarMenu>
      {isSwitching && <OrgSwitchOverlay />}
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="group/org h-14" />}
          >
            <OrgLogo
              name={orgName}
              imageUrl={activeOrg?.imageUrl}
              className="size-10"
            />
            <div className="grid flex-1 text-left leading-tight">
              <span className="truncate font-semibold">{orgName}</span>
              <span className="text-muted-foreground group-hover/org:text-muted truncate text-xs">
                Tài Chính Sumni
              </span>
            </div>
            <ChevronsUpDownIcon className="text-muted-foreground group-hover/org:text-muted ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56"
            side={isMobile ? 'bottom' : 'right'}
            align="start"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel>Văn Phòng</DropdownMenuLabel>
              {orgs.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  disabled={isSwitching}
                  onClick={() => handleSelect(org.id)}
                  className="gap-2"
                >
                  <OrgLogo
                    name={org.name}
                    imageUrl={org.imageUrl}
                    className="size-6"
                  />
                  <span className="truncate">{org.name}</span>
                  {org.id === activeOrg?.id && (
                    <CheckIcon className="ml-auto" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
