import {
  BookOpenIcon,
  ChartColumnIcon,
  SettingsIcon,
  WalletIcon,
} from 'lucide-react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { useIsMobile } from '@/hooks/use-mobile';

import AppHeader from './app-header';
import AppSidebar from './app-sidebar';
import BottomNav from './bottom-nav';

import type { LucideIcon } from 'lucide-react';

type Props = {
  children: React.ReactNode;
};

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
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
  {
    label: 'Báo cáo',
    href: '/reports',
    icon: ChartColumnIcon,
  },
  {
    label: 'Cài đặt',
    href: '/settings',
    icon: SettingsIcon,
  },
] satisfies NavItem[];

export default function AppLayout({ children }: Props) {
  const isMobile = useIsMobile();
  return (
    <div>
      <SidebarProvider>
        <AppSidebar navItems={navItems} />
        <SidebarInset>
          {!isMobile && <AppHeader />}
          {children}
        </SidebarInset>
        <BottomNav navItems={navItems} className="block md:hidden" />
      </SidebarProvider>
    </div>
  );
}
