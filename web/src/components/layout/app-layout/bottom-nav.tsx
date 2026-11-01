import { Link } from '@tanstack/react-router';
import { cn } from 'cn';

import type { NavItem } from './app-layout';

type Props = {
  navItems: NavItem[];
  className?: string;
};

export default function BottomNav({ className, navItems }: Props) {
  return (
    <nav
      className={cn(
        'bg-background fixed inset-x-0 bottom-0 z-50 border-t pb-[env(safe-area-inset-bottom)]',
        className,
      )}
    >
      <ul className="grid grid-cols-4">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              to={item.href}
              className="text-muted-foreground data-active:text-primary flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors data-active:font-bold"
              activeProps={{ 'data-active': true }}
              activeOptions={{ exact: true, includeSearch: false }}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
