import { cn } from 'cn';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import AppBreadcrum from './app-breadcrum';

type AppHeaderProps = {
  className?: string;
};

export default function AppHeader({ className }: AppHeaderProps) {
  return (
    <header
      className={cn(
        'border-border accent flex items-center gap-3 border p-3',
        className,
      )}
    >
      <SidebarTrigger />
      <Separator orientation="vertical" />
      <AppBreadcrum />
    </header>
  );
}
