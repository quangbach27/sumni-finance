import { Link } from '@tanstack/react-router';
import { BookOpenIcon } from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

import type { NavItem } from './app-layout';

type Props = {
  navItems: NavItem[];
};

export default function AppSidebar({ navItems }: Props) {
  const { setOpenMobile } = useSidebar();

  return (
    <Sidebar>
      <SidebarHeader className="flex-row items-center justify-center p-5 text-xl font-bold">
        <span className="bg-primary text-accent rounded-xl p-2">
          <BookOpenIcon />
        </span>
        <h1>Tài Chính Sumni</h1>
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
    </Sidebar>
  );
}
