import { Fragment } from 'react';

import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { LucideIcon } from 'lucide-react';

/** Normal items read as enabled next to a red destructive item. */
export const ROW_ACTION_ITEM_CLASS_NAME =
  'text-foreground font-medium [&_svg]:text-foreground';

export type RowAction = {
  key: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
  destructive?: boolean;
};

/** "..." button that opens a menu of row actions; destructive ones go last. */
export default function RowActionsMenu({ actions }: { actions: RowAction[] }) {
  const normal = actions.filter((action) => !action.destructive);
  const destructive = actions.filter((action) => action.destructive);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Tùy chọn" />}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        {normal.map(({ key, label, icon: Icon, onSelect }) => (
          <DropdownMenuItem
            key={key}
            className={ROW_ACTION_ITEM_CLASS_NAME}
            onClick={onSelect}
          >
            <Icon />
            {label}
          </DropdownMenuItem>
        ))}
        {destructive.length > 0 && (
          <Fragment>
            {normal.length > 0 && <DropdownMenuSeparator />}
            {destructive.map(({ key, label, icon: Icon, onSelect }) => (
              <DropdownMenuItem
                key={key}
                variant="destructive"
                className="font-medium"
                onClick={onSelect}
              >
                <Icon />
                {label}
              </DropdownMenuItem>
            ))}
          </Fragment>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
