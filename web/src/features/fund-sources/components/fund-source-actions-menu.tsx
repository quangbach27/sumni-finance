import { Fragment, Suspense, useState } from 'react';

import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { FUND_SOURCE_ACTION_GROUPS } from './actions/fund-source-actions';

import type { FundSourceAction } from './actions/types';
import type { FundSource } from '../api/types';

type FundSourceActionsMenuProps = { item: FundSource };

export default function FundSourceActionsMenu({
  item,
}: FundSourceActionsMenuProps) {
  const [activeAction, setActiveAction] = useState<FundSourceAction | null>(
    null,
  );

  const groups = FUND_SOURCE_ACTION_GROUPS.map((group) =>
    group.filter((action) => action.isVisible?.(item) ?? true),
  ).filter((group) => group.length > 0);

  const select = (action: FundSourceAction) => {
    if (action.Dialog) setActiveAction(action);
    else action.onSelect?.(item);
  };

  const ActiveDialog = activeAction?.Dialog;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label="Tùy chọn" />}
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{item.name}</DropdownMenuLabel>
          </DropdownMenuGroup>
          {groups.map((group, index) => (
            <Fragment key={index}>
              <DropdownMenuSeparator />
              {group.map((action) => {
                const reason = action.getDisabledReason?.(item);
                const implemented = Boolean(action.Dialog ?? action.onSelect);
                const Icon = action.icon;
                return (
                  <DropdownMenuItem
                    key={action.id}
                    variant={action.variant}
                    disabled={!implemented || Boolean(reason)}
                    onClick={() => select(action)}
                  >
                    <Icon />
                    <span className="flex flex-col">
                      {action.label}
                      {typeof reason === 'string' && (
                        <span className="text-muted-foreground text-xs">
                          {reason}
                        </span>
                      )}
                    </span>
                  </DropdownMenuItem>
                );
              })}
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rendered outside the menu so it survives the menu closing. */}
      {ActiveDialog && (
        <Suspense fallback={null}>
          <ActiveDialog
            fundSource={item}
            onClose={() => setActiveAction(null)}
          />
        </Suspense>
      )}
    </>
  );
}
