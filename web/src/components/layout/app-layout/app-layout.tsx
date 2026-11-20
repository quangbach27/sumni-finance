import {
  BookOpenIcon,
  // ChartColumnIcon,
  SettingsIcon,
  WalletIcon,
} from 'lucide-react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import AppHeader from './app-header';
import AppSidebar from './app-sidebar';

import type { LucideIcon } from 'lucide-react';

type Props = {
  children: React.ReactNode;
};

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Renders a collapsible group; `href` is then only used as the key. */
  children?: { label: string; href: string }[];
};

const navItems = [
  {
    label: 'Nguồn quỹ',
    href: '/fund-sources',
    icon: WalletIcon,
  },
  {
    label: 'Sổ cái',
    href: '/ledger-books',
    icon: BookOpenIcon,
  },
  // {
  //   label: 'Báo cáo',
  //   href: '/reports',
  //   icon: ChartColumnIcon,
  // },
  {
    label: 'Cài đặt',
    href: '/settings',
    icon: SettingsIcon,
    children: [{ label: 'Vai trò và quyền', href: '/settings/roles' }],
  },
] satisfies NavItem[];

export default function AppLayout({ children }: Props) {
  return (
    <div>
      <SidebarProvider>
        <AppSidebar navItems={navItems} />
        <SidebarInset>
          <AppHeader className="bg-background sticky top-0 z-20 h-14" />

          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
