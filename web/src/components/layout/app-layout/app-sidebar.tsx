import { Link } from '@tanstack/react-router';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
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
            {navItems.map((item) => (
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
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
