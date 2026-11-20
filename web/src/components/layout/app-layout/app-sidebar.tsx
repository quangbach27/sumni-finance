import { Link } from '@tanstack/react-router';
import { ChevronDownIcon } from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from '@/components/ui/sidebar';

import NavUser from './nav-user';
import OrgSwitcher from './org-switcher';

import type { NavItem } from './app-layout';

type Props = {
  navItems: NavItem[];
};

export default function AppSidebar({ navItems }: Props) {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader>
        <OrgSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {navItems.map((item) =>
              item.children ? (
                <Collapsible
                  key={item.href}
                  defaultOpen
                  render={<SidebarMenuItem />}
                >
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuButton size="lg" className="text-base" />
                    }
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    <ChevronDownIcon className="ml-auto transition-transform in-data-panel-open:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.children.map((child) => (
                        <SidebarMenuSubItem key={child.href}>
                          <SidebarMenuSubButton
                            render={
                              <Link
                                to={child.href}
                                onClick={() => setOpenMobile(false)}
                                activeProps={{ 'data-active': true }}
                              >
                                <span>{child.label}</span>
                              </Link>
                            }
                          />
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    size="lg"
                    className="text-base"
                    render={
                      <Link
                        to={item.href}
                        onClick={() => setOpenMobile(false)}
                        activeOptions={{ exact: false, includeSearch: false }}
                        activeProps={{ 'data-active': true }}
                      >
                        {<item.icon />}
                        <span>{item.label}</span>
                      </Link>
                    }
                  />
                </SidebarMenuItem>
              ),
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
