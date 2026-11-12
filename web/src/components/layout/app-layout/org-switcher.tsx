import { useState } from 'react';

import { getToken, useOrganization, useOrganizationList } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useRouter } from '@tanstack/react-router';
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

import { cn } from '@/lib/utils';

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
  const { organization } = useOrganization();
  const { userMemberships, setActive } = useOrganizationList({
    userMemberships: { infinite: true },
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const router = useRouter();
  const { isMobile } = useSidebar();
  const [isSwitching, setIsSwitching] = useState(false);

  const orgName = organization?.name ?? 'Chọn tổ chức';

  // Switch the active org in the Clerk session (the token then carries the new
  // org), without a page reload: refresh data and re-run route guards.
  const handleSelect = async (organizationId: string) => {
    if (!setActive || isSwitching || organizationId === organization?.id) {
      return;
    }
    setIsSwitching(true);
    try {
      await setActive({ organization: organizationId });
      // Warm Clerk's token cache with the new-org token so refetches don't
      // send a stale token from the previous org.
      await getToken({ skipCache: true });
      // resetQueries (unlike clear) makes mounted observers refetch.
      await queryClient.resetQueries();
      await router.invalidate();
      await navigate({ to: '/ledger-books' });
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton size="lg" className="group/org h-14" />}
          >
            <OrgLogo
              name={orgName}
              imageUrl={organization?.imageUrl}
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
              {userMemberships.data?.map(({ organization: org }) => (
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
                  {org.id === organization?.id && (
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
